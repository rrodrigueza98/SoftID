import { BadRequestException, Injectable } from '@nestjs/common';
import { Comprobante, ComprobanteItem, Compra, OrdenPago, OrigenAsiento, Prisma, Recibo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAsientoContableDto } from './dto/create-asiento-contable.dto';
import { clasificarBalance, clasificarResultado, esFormaPagoBancaria, GrupoResultado, MapeoContable } from './mapeo-contable';

type TxClient = Prisma.TransactionClient;

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class AsientosContablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAsientoContableDto) {
    const totalDebe = round2(dto.detalles.reduce((s, d) => s + d.debe, 0));
    const totalHaber = round2(dto.detalles.reduce((s, d) => s + d.haber, 0));
    if (totalDebe !== totalHaber) {
      throw new BadRequestException(`El asiento no está balanceado: Debe ${totalDebe} ≠ Haber ${totalHaber}`);
    }
    if (totalDebe === 0) {
      throw new BadRequestException('El asiento no puede tener todos los importes en cero');
    }

    // Cada linea debe cargarse a un solo lado (nunca Debe y Haber a la vez,
    // ni los dos en cero) -- es invalido contablemente y ademas rompe el
    // criterio de signo que usa el resto del sistema (Libro Mayor, Estados
    // Financieros) para calcular saldos.
    for (const detalle of dto.detalles) {
      if (detalle.debe > 0 && detalle.haber > 0) {
        throw new BadRequestException('Cada línea del asiento va solo al Debe o solo al Haber, no a los dos a la vez');
      }
      if (detalle.debe === 0 && detalle.haber === 0) {
        throw new BadRequestException('Cada línea del asiento necesita un importe mayor a cero, en Debe o en Haber');
      }
    }

    // Las cuentas "de grupo" (no imputables, ej. "1-01- ACTIVO CORRIENTE")
    // son encabezados de la jerarquia del Plan de Cuentas, no destinos
    // validos de un movimiento -- postear ahi rompe el desglose que usan el
    // Libro Mayor y los Estados Financieros.
    const cuentaIds = [...new Set(dto.detalles.map((d) => d.cuentaId))];
    const cuentas = await this.prisma.cuentaContable.findMany({ where: { id: { in: cuentaIds } } });
    if (cuentas.length !== cuentaIds.length) {
      throw new BadRequestException('Alguna de las cuentas del asiento no existe');
    }
    for (const cuenta of cuentas) {
      if (cuenta.empresaId !== dto.empresaId) {
        throw new BadRequestException(`La cuenta ${cuenta.codigo} no pertenece a esta empresa`);
      }
      if (!cuenta.imputable) {
        throw new BadRequestException(
          `La cuenta ${cuenta.codigo} ${cuenta.nombre} es una cuenta de grupo (no imputable) -- elegí una subcuenta de detalle`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: dto.empresaId } });
      const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
      this.verificarPeriodoAbierto(empresa, fecha);

      const numero = empresa.proximoNumeroAsiento;
      await tx.empresa.update({ where: { id: dto.empresaId }, data: { proximoNumeroAsiento: { increment: 1 } } });

      return tx.asientoContable.create({
        data: {
          empresaId: dto.empresaId,
          numero,
          fecha,
          concepto: dto.concepto,
          origen: OrigenAsiento.MANUAL,
          detalles: { create: dto.detalles.map((d) => ({ cuentaId: d.cuentaId, debe: d.debe, haber: d.haber, glosa: d.glosa })) },
        },
        include: { detalles: { include: { cuenta: true } } },
      });
    });
  }

  // Ningun asiento (manual o automatico) puede postear con fecha igual o
  // anterior al cierre de periodo de la empresa -- ver Empresa.fechaCierreContable.
  private verificarPeriodoAbierto(empresa: { fechaCierreContable: Date | null }, fecha: Date) {
    if (empresa.fechaCierreContable && fecha <= empresa.fechaCierreContable) {
      throw new BadRequestException(
        `El período contable está cerrado hasta el ${empresa.fechaCierreContable.toISOString().slice(0, 10)} -- no se pueden cargar movimientos con fecha igual o anterior a esa`,
      );
    }
  }

  findAll(params: { empresaId: string; desde?: string; hasta?: string }) {
    const { empresaId, desde, hasta } = params;
    return this.prisma.asientoContable.findMany({
      where: {
        empresaId,
        fecha: {
          gte: desde ? new Date(`${desde}T00:00:00`) : undefined,
          lte: hasta ? new Date(`${hasta}T23:59:59.999`) : undefined,
        },
      },
      include: { detalles: { include: { cuenta: true } } },
      orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
    });
  }

  // Libro Mayor de una cuenta: cada movimiento con su saldo acumulado, en
  // el orden natural de asentamiento (fecha, y a igual fecha el numero de
  // asiento). El saldo arranca en 0 -- no hay "saldo de apertura" propio
  // todavia (queda para cuando se cargue un asiento de apertura inicial).
  async libroMayor(params: { empresaId: string; cuentaId: string; desde?: string; hasta?: string }) {
    const { empresaId, cuentaId, desde, hasta } = params;
    const cuenta = await this.prisma.cuentaContable.findUniqueOrThrow({ where: { id: cuentaId } });

    const detalles = await this.prisma.asientoContableDetalle.findMany({
      where: {
        cuentaId,
        asiento: {
          empresaId,
          fecha: {
            gte: desde ? new Date(`${desde}T00:00:00`) : undefined,
            lte: hasta ? new Date(`${hasta}T23:59:59.999`) : undefined,
          },
        },
      },
      include: { asiento: true },
      orderBy: [{ asiento: { fecha: 'asc' } }, { asiento: { numero: 'asc' } }],
    });

    let saldo = 0;
    const signo = cuenta.naturaleza === 'DEUDORA' ? 1 : -1;
    const movimientos = detalles.map((d) => {
      const debe = Number(d.debe);
      const haber = Number(d.haber);
      saldo = round2(saldo + signo * (debe - haber));
      return {
        asientoId: d.asiento.id,
        numero: d.asiento.numero,
        fecha: d.asiento.fecha,
        concepto: d.asiento.concepto,
        glosa: d.glosa,
        debe,
        haber,
        saldo,
      };
    });

    return { cuenta, movimientos };
  }

  // Balance de Sumas y Saldos: para cada cuenta imputable con movimientos en
  // el rango, el total debe/haber y el saldo segun su naturaleza.
  async balanceSumasSaldos(params: { empresaId: string; desde?: string; hasta?: string }) {
    const { empresaId, desde, hasta } = params;
    const cuentas = await this.prisma.cuentaContable.findMany({
      where: { empresaId, imputable: true },
      orderBy: { codigo: 'asc' },
    });

    const filtroFecha = {
      gte: desde ? new Date(`${desde}T00:00:00`) : undefined,
      lte: hasta ? new Date(`${hasta}T23:59:59.999`) : undefined,
    };

    const filas = [];
    for (const cuenta of cuentas) {
      const agregado = await this.prisma.asientoContableDetalle.aggregate({
        where: { cuentaId: cuenta.id, asiento: { empresaId, fecha: filtroFecha } },
        _sum: { debe: true, haber: true },
      });
      const debe = Number(agregado._sum.debe ?? 0);
      const haber = Number(agregado._sum.haber ?? 0);
      if (debe === 0 && haber === 0) continue;
      const signo = cuenta.naturaleza === 'DEUDORA' ? 1 : -1;
      filas.push({
        cuentaId: cuenta.id,
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        debe: round2(debe),
        haber: round2(haber),
        saldo: round2(signo * (debe - haber)),
      });
    }

    return {
      filas,
      totales: {
        debe: round2(filas.reduce((s, f) => s + f.debe, 0)),
        haber: round2(filas.reduce((s, f) => s + f.haber, 0)),
      },
    };
  }

  private readonly GRUPO_LABEL_RESULTADO: Record<GrupoResultado, string> = {
    VENTAS: 'Ventas',
    COSTO_VENTAS: 'Costo de Ventas',
    OTROS_INGRESOS: 'Otros Ingresos',
    GASTOS_OPERACIONALES: 'Gastos Operacionales',
    GASTOS_VENTAS: 'Gastos de Ventas',
    GASTOS_ADMINISTRACION: 'Gastos de Administración',
    OTROS_GASTOS: 'Otros Gastos',
    GASTOS_FINANCIEROS: 'Gastos Financieros',
    GANANCIAS_EXTRAORDINARIAS: 'Ganancias Extraordinarias',
    PERDIDAS_EXTRAORDINARIAS: 'Pérdidas Extraordinarias',
    IMPUESTO_RENTA: 'Impuesto a la Renta',
  };

  // Estado de Resultados por funcion (NIIF para PYMES, Seccion 5), armado a
  // partir de las cuentas de Ingreso/Egreso del periodo -- mismo dato que ya
  // usa balanceSumasSaldos, solo que agrupado en el formato de varios pasos
  // (utilidad bruta -> operativa -> antes de impuesto -> neta) en vez de
  // listado plano.
  async estadoResultados(params: { empresaId: string; desde: string; hasta: string }) {
    const { empresaId, desde, hasta } = params;
    const cuentas = await this.prisma.cuentaContable.findMany({
      where: { empresaId, imputable: true, tipo: { in: ['INGRESO', 'EGRESO'] } },
      orderBy: { codigo: 'asc' },
    });

    const filtroFecha = { gte: new Date(`${desde}T00:00:00`), lte: new Date(`${hasta}T23:59:59.999`) };

    const gruposMap = new Map<GrupoResultado, { cuentaId: string; codigo: string; nombre: string; monto: number }[]>();
    for (const cuenta of cuentas) {
      const agregado = await this.prisma.asientoContableDetalle.aggregate({
        where: { cuentaId: cuenta.id, asiento: { empresaId, fecha: filtroFecha } },
        _sum: { debe: true, haber: true },
      });
      const debe = Number(agregado._sum.debe ?? 0);
      const haber = Number(agregado._sum.haber ?? 0);
      const monto = round2(cuenta.naturaleza === 'ACREEDORA' ? haber - debe : debe - haber);
      if (monto === 0) continue;
      const grupo = clasificarResultado(cuenta.codigo, cuenta.tipo);
      if (!gruposMap.has(grupo)) gruposMap.set(grupo, []);
      gruposMap.get(grupo)!.push({ cuentaId: cuenta.id, codigo: cuenta.codigo, nombre: cuenta.nombre, monto });
    }

    const grupo = (id: GrupoResultado) => {
      const filas = gruposMap.get(id) ?? [];
      return { label: this.GRUPO_LABEL_RESULTADO[id], filas, total: round2(filas.reduce((s, f) => s + f.monto, 0)) };
    };

    const ventas = grupo('VENTAS');
    const costoVentas = grupo('COSTO_VENTAS');
    const utilidadBruta = round2(ventas.total - costoVentas.total);

    const gastosOperacionales = grupo('GASTOS_OPERACIONALES');
    const gastosVentas = grupo('GASTOS_VENTAS');
    const gastosAdministracion = grupo('GASTOS_ADMINISTRACION');
    const utilidadOperativa = round2(
      utilidadBruta - gastosOperacionales.total - gastosVentas.total - gastosAdministracion.total,
    );

    const otrosIngresos = grupo('OTROS_INGRESOS');
    const otrosGastos = grupo('OTROS_GASTOS');
    const gastosFinancieros = grupo('GASTOS_FINANCIEROS');
    const gananciasExtraordinarias = grupo('GANANCIAS_EXTRAORDINARIAS');
    const perdidasExtraordinarias = grupo('PERDIDAS_EXTRAORDINARIAS');
    const utilidadAntesImpuesto = round2(
      utilidadOperativa +
        otrosIngresos.total +
        gananciasExtraordinarias.total -
        otrosGastos.total -
        gastosFinancieros.total -
        perdidasExtraordinarias.total,
    );

    const impuestoRenta = grupo('IMPUESTO_RENTA');
    const utilidadNeta = round2(utilidadAntesImpuesto - impuestoRenta.total);

    return {
      desde,
      hasta,
      ventas,
      costoVentas,
      utilidadBruta,
      gastosOperacionales,
      gastosVentas,
      gastosAdministracion,
      utilidadOperativa,
      otrosIngresos,
      otrosGastos,
      gastosFinancieros,
      gananciasExtraordinarias,
      perdidasExtraordinarias,
      utilidadAntesImpuesto,
      impuestoRenta,
      utilidadNeta,
    };
  }

  // Estado de Situacion Financiera (NIIF para PYMES, Seccion 4): saldo
  // ACUMULADO de cada cuenta de Activo/Pasivo/Patrimonio hasta la fecha de
  // corte (no un rango -- por eso no hay "desde"), agrupado en
  // corriente/no corriente. El sistema no contabiliza un asiento de cierre
  // de ejercicio, asi que el Resultado del Ejercicio no sale de una cuenta
  // posteada sino que se calcula en vivo (Ingresos - Egresos del año
  // calendario hasta la fecha de corte, mismo criterio fiscal que la DNIT)
  // y se suma al Patrimonio solo para esta presentacion.
  async estadoSituacionFinanciera(params: { empresaId: string; fechaCorte: string }) {
    const { empresaId, fechaCorte } = params;
    const cuentas = await this.prisma.cuentaContable.findMany({
      where: { empresaId, imputable: true, tipo: { in: ['ACTIVO', 'PASIVO', 'PATRIMONIO'] } },
      orderBy: { codigo: 'asc' },
    });

    const hastaFecha = { lte: new Date(`${fechaCorte}T23:59:59.999`) };

    const gruposMap = new Map<
      ReturnType<typeof clasificarBalance>,
      { cuentaId: string; codigo: string; nombre: string; saldo: number }[]
    >();
    for (const cuenta of cuentas) {
      const agregado = await this.prisma.asientoContableDetalle.aggregate({
        where: { cuentaId: cuenta.id, asiento: { empresaId, fecha: hastaFecha } },
        _sum: { debe: true, haber: true },
      });
      const debe = Number(agregado._sum.debe ?? 0);
      const haber = Number(agregado._sum.haber ?? 0);
      const signo = cuenta.naturaleza === 'DEUDORA' ? 1 : -1;
      const saldo = round2(signo * (debe - haber));
      if (saldo === 0) continue;
      const grupo = clasificarBalance(cuenta.codigo, cuenta.tipo);
      if (!gruposMap.has(grupo)) gruposMap.set(grupo, []);
      gruposMap.get(grupo)!.push({ cuentaId: cuenta.id, codigo: cuenta.codigo, nombre: cuenta.nombre, saldo });
    }

    const grupo = (id: ReturnType<typeof clasificarBalance>) => {
      const filas = gruposMap.get(id) ?? [];
      return { filas, total: round2(filas.reduce((s, f) => s + f.saldo, 0)) };
    };

    const activoCorriente = grupo('ACTIVO_CORRIENTE');
    const activoNoCorriente = grupo('ACTIVO_NO_CORRIENTE');
    const totalActivo = round2(activoCorriente.total + activoNoCorriente.total);

    const pasivoCorriente = grupo('PASIVO_CORRIENTE');
    const pasivoNoCorriente = grupo('PASIVO_NO_CORRIENTE');
    const totalPasivo = round2(pasivoCorriente.total + pasivoNoCorriente.total);

    const patrimonio = grupo('PATRIMONIO');

    const anio = fechaCorte.slice(0, 4);
    const resultados = await this.estadoResultados({ empresaId, desde: `${anio}-01-01`, hasta: fechaCorte });
    const resultadoDelEjercicio = resultados.utilidadNeta;

    const totalPatrimonio = round2(patrimonio.total + resultadoDelEjercicio);
    const totalPasivoYPatrimonio = round2(totalPasivo + totalPatrimonio);

    return {
      fechaCorte,
      activoCorriente,
      activoNoCorriente,
      totalActivo,
      pasivoCorriente,
      pasivoNoCorriente,
      totalPasivo,
      patrimonio,
      resultadoDelEjercicio,
      totalPatrimonio,
      totalPasivoYPatrimonio,
      diferencia: round2(totalActivo - totalPasivoYPatrimonio),
    };
  }

  // Genera el asiento inverso (storno) de uno ya posteado: mismas cuentas,
  // debe y haber intercambiados. Se usa para revertir el efecto contable de
  // anular un Comprobante/Compra -- nunca se edita ni se borra un asiento ya
  // asentado, se contrarresta con uno nuevo, fechado el dia de la reversion
  // (no el de la operacion original).
  async generarContraAsiento(tx: TxClient, asientoId: string, concepto: string) {
    const original = await tx.asientoContable.findUniqueOrThrow({
      where: { id: asientoId },
      include: { detalles: true },
    });
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: original.empresaId } });
    const fecha = new Date();
    this.verificarPeriodoAbierto(empresa, fecha);

    const numero = await this.siguienteNumero(tx, original.empresaId);
    return tx.asientoContable.create({
      data: {
        empresaId: original.empresaId,
        numero,
        fecha,
        concepto,
        origen: original.origen,
        comprobanteId: original.comprobanteId,
        compraId: original.compraId,
        reciboId: original.reciboId,
        ordenPagoId: original.ordenPagoId,
        detalles: {
          create: original.detalles.map((d) => ({ cuentaId: d.cuentaId, debe: d.haber, haber: d.debe, glosa: d.glosa })),
        },
      },
    });
  }

  private async siguienteNumero(tx: TxClient, empresaId: string): Promise<number> {
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    await tx.empresa.update({ where: { id: empresaId }, data: { proximoNumeroAsiento: { increment: 1 } } });
    return empresa.proximoNumeroAsiento;
  }

  // Asiento automatico de una venta (Factura Electronica emitida):
  //   Debe  Caja/Banco (contado) o Clientes (credito)      = total
  //   Haber Ventas (neto de IVA)                            = subtotal
  //   Haber IVA Debito Fiscal                                = iva
  // Mas, si hay costo cargado en los items (ver costoUnitario, usado
  // tambien por el reporte de rentabilidad):
  //   Debe  Costo de Mercaderia Vendida                      = costo
  //   Haber Inventario                                       = costo
  // Si a la empresa le falta algun rol mapeado no rompe la venta -- solo se
  // omite esa pata del asiento (queda para cargar el mapeo despues).
  async generarAsientoVenta(
    tx: TxClient,
    comprobante: Comprobante & { items: ComprobanteItem[] },
    formaPago: string | undefined,
  ) {
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: comprobante.empresaId } });
    this.verificarPeriodoAbierto(empresa, comprobante.fechaEmision);
    const mapeo = (empresa.mapeoContable as MapeoContable | null) ?? {};

    const total = Number(comprobante.total);
    const neto = round2(Number(comprobante.subtotalExenta) + Number(comprobante.subtotalGravada10) + Number(comprobante.subtotalGravada5));
    const iva = round2(Number(comprobante.iva10) + Number(comprobante.iva5));

    const cuentaContrapartidaId =
      comprobante.condicionVenta === 'CREDITO'
        ? mapeo.CLIENTES
        : esFormaPagoBancaria(formaPago)
          ? mapeo.BANCO
          : mapeo.CAJA;

    const detalles: { cuentaId: string; debe: number; haber: number }[] = [];
    if (cuentaContrapartidaId) detalles.push({ cuentaId: cuentaContrapartidaId, debe: total, haber: 0 });
    if (mapeo.VENTAS && neto > 0) detalles.push({ cuentaId: mapeo.VENTAS, debe: 0, haber: neto });
    if (mapeo.IVA_DEBITO && iva > 0) detalles.push({ cuentaId: mapeo.IVA_DEBITO, debe: 0, haber: iva });

    const costoTotal = round2(
      comprobante.items.reduce((s, item) => s + (item.costoUnitario ? Number(item.costoUnitario) * Number(item.cantidad) : 0), 0),
    );
    if (mapeo.COSTO_VENTA && mapeo.INVENTARIO && costoTotal > 0) {
      detalles.push({ cuentaId: mapeo.COSTO_VENTA, debe: costoTotal, haber: 0 });
      detalles.push({ cuentaId: mapeo.INVENTARIO, debe: 0, haber: costoTotal });
    }

    // Si falta el mapeo de alguna cuenta clave el asiento queda desbalanceado
    // -- mejor no generarlo (y que se vea en el Libro Diario que faltan
    // ventas sin asentar) que registrar una mitad de movimiento incorrecta.
    const totalDebe = round2(detalles.reduce((s, d) => s + d.debe, 0));
    const totalHaber = round2(detalles.reduce((s, d) => s + d.haber, 0));
    if (detalles.length === 0 || totalDebe !== totalHaber) return null;

    const numero = await this.siguienteNumero(tx, comprobante.empresaId);
    return tx.asientoContable.create({
      data: {
        empresaId: comprobante.empresaId,
        numero,
        fecha: comprobante.fechaEmision,
        concepto: `Venta ${comprobante.tipoDocumento} Nº ${comprobante.numero}`,
        origen: OrigenAsiento.VENTA,
        comprobanteId: comprobante.id,
        detalles: { create: detalles },
      },
    });
  }

  // Asiento automatico de un cobro (Recibo):
  //   Debe  Caja/Banco (segun forma de pago)   = monto
  //   Haber Clientes                            = monto
  async generarAsientoCobro(tx: TxClient, recibo: Recibo) {
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: recibo.empresaId } });
    this.verificarPeriodoAbierto(empresa, recibo.fecha);
    const mapeo = (empresa.mapeoContable as MapeoContable | null) ?? {};

    const cuentaOrigenId = esFormaPagoBancaria(recibo.formaPago) ? mapeo.BANCO : mapeo.CAJA;
    if (!cuentaOrigenId || !mapeo.CLIENTES) return null;

    const monto = Number(recibo.monto);
    const numero = await this.siguienteNumero(tx, recibo.empresaId);
    return tx.asientoContable.create({
      data: {
        empresaId: recibo.empresaId,
        numero,
        fecha: recibo.fecha,
        concepto: `Cobro Recibo Nº ${recibo.numero}`,
        origen: OrigenAsiento.COBRO,
        reciboId: recibo.id,
        detalles: {
          create: [
            { cuentaId: cuentaOrigenId, debe: monto, haber: 0 },
            { cuentaId: mapeo.CLIENTES, debe: 0, haber: monto },
          ],
        },
      },
    });
  }

  // Asiento automatico de un pago a proveedor (Orden de Pago) -- espejo
  // exacto de generarAsientoCobro:
  //   Debe  Proveedores (se reduce la deuda)
  //   Haber Caja o Banco, segun si la Orden de Pago tiene cuentaBancariaId
  async generarAsientoPago(tx: TxClient, ordenPago: OrdenPago) {
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: ordenPago.empresaId } });
    this.verificarPeriodoAbierto(empresa, ordenPago.fecha);
    const mapeo = (empresa.mapeoContable as MapeoContable | null) ?? {};

    const cuentaDestinoId = ordenPago.cuentaBancariaId
      ? mapeo.BANCO
      : esFormaPagoBancaria(ordenPago.formaPago)
        ? mapeo.BANCO
        : mapeo.CAJA;
    if (!cuentaDestinoId || !mapeo.PROVEEDORES) return null;

    const monto = Number(ordenPago.monto);
    const numero = await this.siguienteNumero(tx, ordenPago.empresaId);
    return tx.asientoContable.create({
      data: {
        empresaId: ordenPago.empresaId,
        numero,
        fecha: ordenPago.fecha,
        concepto: `Pago Orden Nº ${ordenPago.numero}`,
        origen: OrigenAsiento.PAGO,
        ordenPagoId: ordenPago.id,
        detalles: {
          create: [
            { cuentaId: mapeo.PROVEEDORES, debe: monto, haber: 0 },
            { cuentaId: cuentaDestinoId, debe: 0, haber: monto },
          ],
        },
      },
    });
  }

  // Asiento automatico de una compra (comprobante de proveedor registrado
  // manualmente):
  //   Debe  [cuenta de gasto/activo elegida en la compra]  = neto (exenta+gravada)
  //   Debe  IVA Credito Fiscal                               = iva
  //   Haber Proveedores (credito) o Caja/Banco (contado)     = total
  async generarAsientoCompra(tx: TxClient, compra: Compra) {
    const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: compra.empresaId } });
    this.verificarPeriodoAbierto(empresa, compra.fechaEmision);
    const mapeo = (empresa.mapeoContable as MapeoContable | null) ?? {};

    const total = Number(compra.total);
    const neto = round2(Number(compra.montoExenta) + Number(compra.montoGravada10) + Number(compra.montoGravada5));
    const iva = round2(Number(compra.iva10) + Number(compra.iva5));

    const cuentaContrapartidaId =
      compra.condicionCompra === 'CREDITO'
        ? mapeo.PROVEEDORES
        : esFormaPagoBancaria(compra.formaPago ?? undefined)
          ? mapeo.BANCO
          : mapeo.CAJA;

    const detalles: { cuentaId: string; debe: number; haber: number }[] = [];
    if (neto > 0) detalles.push({ cuentaId: compra.cuentaContableId, debe: neto, haber: 0 });
    if (mapeo.IVA_CREDITO && iva > 0) detalles.push({ cuentaId: mapeo.IVA_CREDITO, debe: iva, haber: 0 });
    if (cuentaContrapartidaId) detalles.push({ cuentaId: cuentaContrapartidaId, debe: 0, haber: total });

    // Mismo criterio que en generarAsientoVenta: si falta algun mapeo clave
    // y el asiento queda desbalanceado, mejor no generarlo.
    const totalDebe = round2(detalles.reduce((s, d) => s + d.debe, 0));
    const totalHaber = round2(detalles.reduce((s, d) => s + d.haber, 0));
    if (detalles.length === 0 || totalDebe !== totalHaber) return null;

    const numero = await this.siguienteNumero(tx, compra.empresaId);
    return tx.asientoContable.create({
      data: {
        empresaId: compra.empresaId,
        numero,
        fecha: compra.fechaEmision,
        concepto: `Compra Nº ${compra.numeroComprobante} — ${compra.concepto}`,
        origen: OrigenAsiento.COMPRA,
        compraId: compra.id,
        detalles: { create: detalles },
      },
    });
  }
}
