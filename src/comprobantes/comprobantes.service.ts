import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CondicionVenta,
  EstadoComprobante,
  EstadoDocumentoElectronico,
  TipoDocumentoElectronico,
  TipoMovimientoCuentaCorriente,
  TipoMovimientoStock,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { AsientosContablesService } from '../contabilidad/asientos-contables.service';
import { SifenService } from '../sifen/sifen.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { CorregirComprobanteDto } from './dto/corregir-comprobante.dto';
import { calcularItem, calcularSubtotales } from './comprobantes.util';

const NOTAS_QUE_REQUIEREN_MOTIVO: TipoDocumentoElectronico[] = [
  TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_DEBITO_ELECTRONICA,
];

// Abreviaturas cortas para el reporte -- mismo criterio que
// frontend/src/pages/comprobante-labels.ts (TIPO_DOCUMENTO_ABREVIADO).
const TIPO_DOCUMENTO_ABREVIADO: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'FE',
  NOTA_CREDITO_ELECTRONICA: 'NCE',
  NOTA_DEBITO_ELECTRONICA: 'NDE',
  AUTOFACTURA_ELECTRONICA: 'AFE',
  NOTA_REMISION_ELECTRONICA: 'NRE',
  COMPROBANTE_RETENCION_ELECTRONICO: 'CRE',
};

@Injectable()
export class ComprobantesService {
  private readonly logger = new Logger(ComprobantesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly asientosContablesService: AsientosContablesService,
    private readonly sifenService: SifenService,
  ) {}

  async create(dto: CreateComprobanteDto) {
    // Un timbrado tradicional (preimpreso/virtual, sin DTE) no tiene ninguna
    // de las exigencias de SIFEN -- el comprobante es solo numerado. Ambos
    // regimenes pueden convivir en la misma empresa segun el timbrado usado.
    const timbrado = await this.prisma.timbrado.findUniqueOrThrow({ where: { id: dto.timbradoId } });

    if (timbrado.esElectronico) {
      if (NOTAS_QUE_REQUIEREN_MOTIVO.includes(dto.tipoDocumento) && !dto.motivoEmision) {
        throw new BadRequestException(
          `${dto.tipoDocumento} requiere motivoEmision (catalogo SIFEN de Nota de Credito/Debito)`,
        );
      }
      if (dto.tipoDocumento === TipoDocumentoElectronico.NOTA_REMISION_ELECTRONICA && !dto.datosTransporteRemision) {
        throw new BadRequestException(
          'NOTA_REMISION_ELECTRONICA requiere datosTransporteRemision (grupos E6/E10 del Manual Tecnico SIFEN)',
        );
      }
      if (dto.tipoDocumento === TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA && !dto.datosVendedorAutofactura) {
        throw new BadRequestException(
          'AUTOFACTURA_ELECTRONICA requiere datosVendedorAutofactura (grupo E4 del Manual Tecnico SIFEN)',
        );
      }
    }

    const itemsCalculados = dto.items.map((item) => ({ ...item, ...calcularItem(item) }));
    const subtotales = calcularSubtotales(itemsCalculados);

    // Costo de cada producto al momento de la venta, para el reporte de
    // rentabilidad -- se saca antes del create para que quede "congelado"
    // en el item aunque el costo del producto cambie despues.
    const productoIds = [...new Set(itemsCalculados.map((i) => i.productoId).filter((id): id is string => !!id))];
    const productos = productoIds.length
      ? await this.prisma.producto.findMany({ where: { id: { in: productoIds } } })
      : [];
    const costoPorProducto = new Map(productos.map((p) => [p.id, p.precioCosto]));

    const comprobanteCreado = await this.prisma.$transaction(async (tx) => {
      if (dto.sesionCajaId) {
        const sesion = await tx.sesionCaja.findUniqueOrThrow({ where: { id: dto.sesionCajaId } });
        if (sesion.estado !== 'ABIERTA') {
          throw new BadRequestException('La sesión de caja indicada ya está cerrada');
        }
      }

      // El numero de comprobante sale siempre del timbrado (proximoNumero),
      // nunca lo manda el cliente -- es la unica forma de garantizar que no
      // se salteen ni se repitan numeros dentro de un timbrado (obligatorio
      // para que el CDC de SIFEN sea valido mas adelante).
      const timbrado = await tx.timbrado.findUniqueOrThrow({ where: { id: dto.timbradoId } });
      if (!timbrado.activo) {
        throw new BadRequestException('El timbrado seleccionado no esta activo');
      }
      if (timbrado.tipoDocumento !== dto.tipoDocumento) {
        throw new BadRequestException(
          `El timbrado seleccionado es para ${timbrado.tipoDocumento}, no para ${dto.tipoDocumento}`,
        );
      }
      if (timbrado.proximoNumero > timbrado.numeroHasta) {
        throw new BadRequestException('El timbrado agoto su rango de numeracion');
      }
      const numero = String(timbrado.proximoNumero).padStart(7, '0');
      await tx.timbrado.update({
        where: { id: dto.timbradoId },
        data: { proximoNumero: { increment: 1 } },
      });

      const comprobante = await tx.comprobante.create({
        data: {
          empresaId: dto.empresaId,
          puntoExpedicionId: dto.puntoExpedicionId,
          timbradoId: dto.timbradoId,
          tipoDocumento: dto.tipoDocumento,
          numero,
          fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : undefined,
          clienteId: dto.clienteId,
          proveedorId: dto.proveedorId,
          condicionVenta: dto.condicionVenta ?? CondicionVenta.CONTADO,
          condicionPagoId: dto.condicionPagoId,
          condicionCredito: dto.condicionCredito,
          plazoCredito: dto.plazoCredito,
          cantidadCuotas: dto.cantidadCuotas,
          moneda: dto.moneda ?? 'PYG',
          tipoCambio: dto.tipoCambio,
          comprobanteAsociadoId: dto.comprobanteAsociadoId,
          motivoEmision: dto.motivoEmision,
          observacion: dto.observacion,
          sesionCajaId: dto.sesionCajaId,
          estado: EstadoComprobante.EMITIDO,
          ...subtotales,
          items: {
            create: itemsCalculados.map((item) => ({
              productoId: item.productoId,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              unidadMedidaId: item.unidadMedidaId,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento ?? 0,
              afectacionIva: item.afectacionIva,
              tasaIva: item.tasaIva,
              proporcionGravada: item.proporcionGravada,
              montoExenta: item.montoExenta,
              montoGravado: item.montoGravado,
              liquidacionIva: item.liquidacionIva,
              total: item.total,
              costoUnitario: item.productoId ? costoPorProducto.get(item.productoId) : undefined,
            })),
          },
          datosTransporteRemision: dto.datosTransporteRemision
            ? {
                create: {
                  ...dto.datosTransporteRemision,
                  fechaEmisionFacturaFutura: dto.datosTransporteRemision.fechaEmisionFacturaFutura
                    ? new Date(dto.datosTransporteRemision.fechaEmisionFacturaFutura)
                    : undefined,
                  fechaInicioTraslado: new Date(dto.datosTransporteRemision.fechaInicioTraslado),
                  fechaFinTraslado: new Date(dto.datosTransporteRemision.fechaFinTraslado),
                },
              }
            : undefined,
          datosVendedorAutofactura: dto.datosVendedorAutofactura
            ? { create: dto.datosVendedorAutofactura }
            : undefined,
        },
        include: { items: true },
      });

      // Efectos automaticos deliberadamente acotados a los casos sin ambiguedad:
      //  - Stock: solo FACTURA_ELECTRONICA (venta) descuenta stock, y solo si
      //    se paso depositoId. NC/ND/Remision/Autofactura no tocan stock solas
      //    -- sus efectos varian segun el motivo/caso de uso real y forzar un
      //    unico movimiento seria adivinar. Se registran a mano via
      //    /movimientos-stock cuando corresponda.
      //  - Cuenta corriente: solo si hay clienteId (lado ventas). El lado
      //    proveedor (compras/autofactura) usa el mismo modelo de
      //    CuentaCorriente pero con una convencion de signo distinta (nosotros
      //    les debemos a ellos), que todavia no esta definida -- se deja para
      //    cuando se implemente el modulo de compras.
      if (dto.tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA && dto.depositoId) {
        for (const item of comprobante.items) {
          if (!item.productoId) continue;
          const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (!producto?.controlaStock) continue;
          await this.stockService.registrarMovimiento(
            {
              productoId: item.productoId,
              depositoId: dto.depositoId,
              tipo: TipoMovimientoStock.VENTA,
              cantidad: Number(item.cantidad),
              comprobanteId: comprobante.id,
            },
            tx,
          );
        }
      }

      // Asiento contable automatico: mismo alcance que el efecto de stock de
      // arriba (solo Factura Electronica = venta real), pero sin requerir
      // depositoId -- la contabilidad no depende de si se controla stock.
      if (dto.tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA) {
        await this.asientosContablesService.generarAsientoVenta(tx, comprobante, dto.formaPago, dto.cuentaBancariaId);
      }

      // SIFEN exige informar la forma de pago (E606) cuando la operacion es
      // al contado (E601=1, grupo obligatorio para Factura y Autofactura).
      // Se registra de una el pago por el total, en vez de dejarlo como un
      // paso aparte que se pueda omitir -- si no, quedaria una factura
      // "contado" sin ningun ComprobantePago asociado.
      const esFacturaOAutofactura =
        dto.tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA ||
        dto.tipoDocumento === TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA;
      if (esFacturaOAutofactura && comprobante.condicionVenta === CondicionVenta.CONTADO && dto.formaPago) {
        const comprobantePago = await tx.comprobantePago.create({
          data: {
            comprobanteId: comprobante.id,
            formaPago: dto.formaPago,
            monto: subtotales.total,
            fecha: comprobante.fechaEmision,
            cuentaBancariaId: dto.cuentaBancariaId,
          },
        });

        // Igual que en Recibos: si se eligio una cuenta bancaria puntual, el
        // cobro tambien queda como movimiento en Bancos, listo para
        // conciliar contra el extracto.
        if (dto.cuentaBancariaId) {
          await tx.movimientoBancario.create({
            data: {
              cuentaBancariaId: dto.cuentaBancariaId,
              fecha: comprobante.fechaEmision,
              concepto: `Venta ${dto.tipoDocumento} Nº ${numero}`,
              tipo: 'CREDITO',
              monto: subtotales.total,
              referencia: numero,
              comprobantePagoId: comprobantePago.id,
            },
          });
        }
      }

      if (dto.clienteId && dto.condicionVenta === CondicionVenta.CREDITO) {
        const cuenta = await tx.cuentaCorriente.findUnique({ where: { terceroId: dto.clienteId } });
        if (!cuenta) throw new NotFoundException(`El cliente ${dto.clienteId} no tiene cuenta corriente`);

        const esNotaCredito = dto.tipoDocumento === TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA;

        // Solo la deuda nueva (factura) tiene sentido de "vencimiento" -- una
        // nota de credito reduce saldo, no genera un plazo propio. Se calcula
        // en base al plazo de la condicion de pago del comprobante (0 dias si
        // no tiene una asignada, equivalente a "vence el mismo dia").
        let fechaVencimiento: Date | undefined;
        if (!esNotaCredito) {
          const condicionPago = dto.condicionPagoId
            ? await tx.condicionPago.findUnique({ where: { id: dto.condicionPagoId } })
            : null;
          fechaVencimiento = new Date(comprobante.fechaEmision);
          fechaVencimiento.setDate(fechaVencimiento.getDate() + (condicionPago?.diasPlazo ?? 0));
        }

        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: cuenta.id,
            tipo: esNotaCredito ? TipoMovimientoCuentaCorriente.CREDITO : TipoMovimientoCuentaCorriente.DEBITO,
            monto: subtotales.total,
            concepto: `${dto.tipoDocumento} Nº ${numero}`,
            comprobanteId: comprobante.id,
            fechaVencimiento,
          },
          tx,
        );
      }

      return tx.comprobante.findUniqueOrThrow({
        where: { id: comprobante.id },
        include: { items: true, cliente: true, proveedor: true },
      });
    });

    // El envío a SIFEN va DESPUÉS de la transacción (nunca dentro -- una
    // llamada de red no pertenece a una transacción de DB) y en
    // best-effort: si SIFEN esta caido o tarda, la venta local ya quedo
    // hecha (stock, cuenta corriente, asiento, pago) y no hay infraestructura
    // de colas para reintentar en segundo plano -- SifenService.generarYEnviar
    // ya deja el DocumentoElectronico en PENDIENTE_ENVIO para reintentar
    // despues a mano (PATCH /comprobantes/:id/reintentar-sifen).
    if (timbrado.esElectronico) {
      this.sifenService.generarYEnviar(comprobanteCreado.id).catch((err) => {
        this.logger.warn(
          `Envío a SIFEN falló para comprobante ${comprobanteCreado.id}: ${err instanceof Error ? err.message : err}`,
        );
      });
    }

    return comprobanteCreado;
  }

  findAll(params: {
    empresaId: string;
    clienteId?: string;
    proveedorId?: string;
    tipoDocumento?: TipoDocumentoElectronico;
    // undefined = sin restriccion (ADMIN/superadmin/operador sin restringir).
    puntosExpedicionPermitidos?: string[];
  }) {
    const { empresaId, clienteId, proveedorId, tipoDocumento, puntosExpedicionPermitidos } = params;
    return this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...(clienteId ? { clienteId } : {}),
        ...(proveedorId ? { proveedorId } : {}),
        ...(tipoDocumento ? { tipoDocumento } : {}),
        ...(puntosExpedicionPermitidos ? { puntoExpedicionId: { in: puntosExpedicionPermitidos } } : {}),
      },
      include: {
        items: true,
        cliente: true,
        proveedor: true,
        timbrado: { select: { esElectronico: true } },
        // Select acotado a proposito -- el listado puede tener muchas filas y
        // los campos de XML (xmlGenerado/xmlFirmado/xmlRespuestaSet) son
        // Text potencialmente grandes que solo hacen falta en el detalle.
        documentoElectronico: { select: { estado: true, cdc: true, motivoRechazo: true } },
      },
      orderBy: { fechaEmision: 'desc' },
    });
  }

  async findOne(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      include: {
        items: { include: { unidadMedida: true, producto: { select: { codigo: true } } } },
        cliente: true,
        proveedor: true,
        pagos: true,
        movimientosStock: true,
        movimientosCuentaCorriente: true,
        documentoElectronico: true,
        empresa: true,
        timbrado: { include: { puntoExpedicion: { include: { establecimiento: true } } } },
        datosTransporteRemision: true,
        datosVendedorAutofactura: true,
      },
    });
    if (!comprobante) throw new NotFoundException(`Comprobante ${id} no encontrado`);
    return comprobante;
  }

  // Anular revierte automaticamente todo lo que genero el comprobante:
  // stock (contramovimiento DEVOLUCION_VENTA), cuenta corriente
  // (contramovimiento de signo opuesto) y el asiento contable (storno, ver
  // generarContraAsiento). Se bloquea si ya tiene cobros aplicados (Recibo)
  // -- primero hay que revertir esos recibos, porque anular por debajo de un
  // cobro ya aplicado dejaria un pago huerfano sin factura valida detras.
  async anular(id: string) {
    // Si el comprobante es electronico y su DE ya fue APROBADO por SIFEN, no
    // alcanza con anularlo localmente -- primero hay que mandar un Evento de
    // Cancelacion. Esto va ANTES (y fuera) de la transaccion de reversion:
    // si SIFEN lo rechaza (ej. fuera de la ventana de tiempo permitida), la
    // anulacion local no debe proceder, para no divergir del estado real en
    // SIFEN. Si el DE nunca llego a APROBADO (BORRADOR/PENDIENTE_ENVIO/
    // RECHAZADO), no hay nada que cancelar en SIFEN y se sigue como siempre.
    const paraVerificarDe = await this.prisma.comprobante.findUnique({
      where: { id },
      include: { documentoElectronico: true, timbrado: true },
    });
    if (!paraVerificarDe) throw new NotFoundException(`Comprobante ${id} no encontrado`);

    if (paraVerificarDe.timbrado.esElectronico && paraVerificarDe.documentoElectronico) {
      const estadoDe = paraVerificarDe.documentoElectronico.estado;
      if (estadoDe === EstadoDocumentoElectronico.APROBADO || estadoDe === EstadoDocumentoElectronico.APROBADO_CON_OBSERVACION) {
        await this.sifenService.cancelar(paraVerificarDe.documentoElectronico.id, `Anulación de comprobante Nº ${paraVerificarDe.numero}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const comprobante = await tx.comprobante.findUnique({
        where: { id },
        include: {
          movimientosStock: true,
          movimientosCuentaCorriente: true,
          asientosContables: true,
          pagos: { include: { movimientoBancario: true } },
        },
      });
      if (!comprobante) throw new NotFoundException(`Comprobante ${id} no encontrado`);
      if (comprobante.estado === EstadoComprobante.ANULADO) {
        throw new BadRequestException('El comprobante ya esta anulado');
      }

      const aplicaciones = await tx.reciboAplicacion.count({ where: { comprobanteId: id } });
      if (aplicaciones > 0) {
        throw new BadRequestException(
          'Este comprobante ya tiene cobros aplicados -- revertí esos recibos antes de anularlo',
        );
      }

      // Si el cobro contado quedo enlazado a un movimiento bancario, no se
      // puede anular el comprobante dejandolo huerfano -- mismo criterio que
      // borrar un movimiento a mano (MovimientosBancariosService.remove): si
      // ya esta conciliado contra el extracto real, primero hay que
      // desconciliarlo. Si no esta conciliado, se borra junto con la
      // anulacion (el dinero nunca llego a formar parte de una venta real).
      for (const pago of comprobante.pagos) {
        if (!pago.movimientoBancario) continue;
        if (pago.movimientoBancario.conciliado) {
          throw new BadRequestException(
            'El cobro de este comprobante ya esta conciliado en Bancos -- desconcilialo antes de anular',
          );
        }
        await tx.movimientoBancario.delete({ where: { id: pago.movimientoBancario.id } });
      }

      for (const mov of comprobante.movimientosStock) {
        if (mov.tipo !== TipoMovimientoStock.VENTA) continue;
        await this.stockService.registrarMovimiento(
          {
            productoId: mov.productoId,
            depositoId: mov.depositoId,
            tipo: TipoMovimientoStock.DEVOLUCION_VENTA,
            cantidad: Number(mov.cantidad),
            comprobanteId: comprobante.id,
            observacion: `Reversión por anulación de comprobante Nº ${comprobante.numero}`,
          },
          tx,
        );
      }

      for (const mov of comprobante.movimientosCuentaCorriente) {
        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: mov.cuentaCorrienteId,
            tipo:
              mov.tipo === TipoMovimientoCuentaCorriente.DEBITO
                ? TipoMovimientoCuentaCorriente.CREDITO
                : TipoMovimientoCuentaCorriente.DEBITO,
            monto: Number(mov.monto),
            concepto: `Anulación Comprobante Nº ${comprobante.numero}`,
            comprobanteId: comprobante.id,
          },
          tx,
        );
      }

      for (const asiento of comprobante.asientosContables) {
        await this.asientosContablesService.generarContraAsiento(
          tx,
          asiento.id,
          `Anulación Comprobante Nº ${comprobante.numero}`,
        );
      }

      return tx.comprobante.update({
        where: { id },
        data: { estado: EstadoComprobante.ANULADO },
      });
    });
  }

  // Corregir: para un comprobante cuyo Documento Electronico fue RECHAZADO
  // por SIFEN (nunca aprobado, asi que no hay nada que cancelar ni ninguna
  // divergencia con SIFEN posible). Permite editar todo lo que NO compone el
  // CDC (cliente/proveedor, items, condicion de venta/credito, moneda, forma
  // de pago, motivo de NC/ND, datos de remision/autofactura, observacion) --
  // el tipo de documento, establecimiento/punto de expedicion (via
  // timbradoId), numero y fecha de emision quedan fijos, tal como se
  // generaron la primera vez (ver CorregirComprobanteDto). Estructuralmente
  // es "anular() sin marcar ANULADO" + "create() sin asignar numero nuevo":
  // revierte los efectos automaticos generados con los datos viejos
  // (stock, asiento contable, cobro/pago, cuenta corriente) y los rehace con
  // los datos corregidos, dentro de la misma transaccion. Despues de
  // corregir, el usuario reintenta el envio a SIFEN con el botion/endpoint
  // que ya existe (reintentar-sifen) -- no se encadena automaticamente aca.
  async corregir(id: string, dto: CorregirComprobanteDto) {
    const paraVerificar = await this.prisma.comprobante.findUnique({
      where: { id },
      include: { documentoElectronico: true, timbrado: true },
    });
    if (!paraVerificar) throw new NotFoundException(`Comprobante ${id} no encontrado`);
    if (paraVerificar.estado === EstadoComprobante.ANULADO) {
      throw new BadRequestException('No se puede corregir un comprobante anulado');
    }
    if (
      !paraVerificar.timbrado.esElectronico ||
      !paraVerificar.documentoElectronico ||
      paraVerificar.documentoElectronico.estado !== EstadoDocumentoElectronico.RECHAZADO
    ) {
      throw new BadRequestException(
        'Solo se puede corregir un comprobante electrónico cuyo Documento Electrónico fue rechazado por SIFEN',
      );
    }

    const tipoDocumento = paraVerificar.tipoDocumento;
    if (NOTAS_QUE_REQUIEREN_MOTIVO.includes(tipoDocumento) && !dto.motivoEmision) {
      throw new BadRequestException(
        `${tipoDocumento} requiere motivoEmision (catalogo SIFEN de Nota de Credito/Debito)`,
      );
    }
    if (tipoDocumento === TipoDocumentoElectronico.NOTA_REMISION_ELECTRONICA && !dto.datosTransporteRemision) {
      throw new BadRequestException(
        'NOTA_REMISION_ELECTRONICA requiere datosTransporteRemision (grupos E6/E10 del Manual Tecnico SIFEN)',
      );
    }
    if (tipoDocumento === TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA && !dto.datosVendedorAutofactura) {
      throw new BadRequestException(
        'AUTOFACTURA_ELECTRONICA requiere datosVendedorAutofactura (grupo E4 del Manual Tecnico SIFEN)',
      );
    }

    const itemsCalculados = dto.items.map((item) => ({ ...item, ...calcularItem(item) }));
    const subtotales = calcularSubtotales(itemsCalculados);

    const productoIds = [...new Set(itemsCalculados.map((i) => i.productoId).filter((pid): pid is string => !!pid))];
    const productos = productoIds.length
      ? await this.prisma.producto.findMany({ where: { id: { in: productoIds } } })
      : [];
    const costoPorProducto = new Map(productos.map((p) => [p.id, p.precioCosto]));

    return this.prisma.$transaction(async (tx) => {
      const comprobante = await tx.comprobante.findUnique({
        where: { id },
        include: {
          movimientosStock: true,
          movimientosCuentaCorriente: true,
          asientosContables: true,
          pagos: { include: { movimientoBancario: true } },
        },
      });
      if (!comprobante) throw new NotFoundException(`Comprobante ${id} no encontrado`);

      const aplicaciones = await tx.reciboAplicacion.count({ where: { comprobanteId: id } });
      if (aplicaciones > 0) {
        throw new BadRequestException(
          'Este comprobante ya tiene cobros aplicados -- revertí esos recibos antes de corregirlo',
        );
      }

      for (const pago of comprobante.pagos) {
        if (!pago.movimientoBancario) continue;
        if (pago.movimientoBancario.conciliado) {
          throw new BadRequestException(
            'El cobro de este comprobante ya esta conciliado en Bancos -- desconcilialo antes de corregir',
          );
        }
        await tx.movimientoBancario.delete({ where: { id: pago.movimientoBancario.id } });
      }
      await tx.comprobantePago.deleteMany({ where: { comprobanteId: id } });

      for (const mov of comprobante.movimientosStock) {
        if (mov.tipo !== TipoMovimientoStock.VENTA) continue;
        await this.stockService.registrarMovimiento(
          {
            productoId: mov.productoId,
            depositoId: mov.depositoId,
            tipo: TipoMovimientoStock.DEVOLUCION_VENTA,
            cantidad: Number(mov.cantidad),
            comprobanteId: comprobante.id,
            observacion: `Reversión por corrección de comprobante Nº ${comprobante.numero}`,
          },
          tx,
        );
      }

      for (const mov of comprobante.movimientosCuentaCorriente) {
        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: mov.cuentaCorrienteId,
            tipo:
              mov.tipo === TipoMovimientoCuentaCorriente.DEBITO
                ? TipoMovimientoCuentaCorriente.CREDITO
                : TipoMovimientoCuentaCorriente.DEBITO,
            monto: Number(mov.monto),
            concepto: `Corrección Comprobante Nº ${comprobante.numero}`,
            comprobanteId: comprobante.id,
          },
          tx,
        );
      }

      for (const asiento of comprobante.asientosContables) {
        await this.asientosContablesService.generarContraAsiento(
          tx,
          asiento.id,
          `Corrección Comprobante Nº ${comprobante.numero}`,
        );
      }

      await tx.comprobanteItem.deleteMany({ where: { comprobanteId: id } });
      await tx.datosTransporteRemision.deleteMany({ where: { comprobanteId: id } });
      await tx.datosVendedorAutofactura.deleteMany({ where: { comprobanteId: id } });

      const actualizado = await tx.comprobante.update({
        where: { id },
        data: {
          clienteId: dto.clienteId,
          proveedorId: dto.proveedorId,
          condicionVenta: dto.condicionVenta ?? CondicionVenta.CONTADO,
          condicionPagoId: dto.condicionPagoId,
          condicionCredito: dto.condicionCredito,
          plazoCredito: dto.plazoCredito,
          cantidadCuotas: dto.cantidadCuotas,
          moneda: dto.moneda ?? 'PYG',
          tipoCambio: dto.tipoCambio,
          comprobanteAsociadoId: dto.comprobanteAsociadoId,
          motivoEmision: dto.motivoEmision,
          observacion: dto.observacion,
          ...subtotales,
          items: {
            create: itemsCalculados.map((item) => ({
              productoId: item.productoId,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              unidadMedidaId: item.unidadMedidaId,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento ?? 0,
              afectacionIva: item.afectacionIva,
              tasaIva: item.tasaIva,
              proporcionGravada: item.proporcionGravada,
              montoExenta: item.montoExenta,
              montoGravado: item.montoGravado,
              liquidacionIva: item.liquidacionIva,
              total: item.total,
              costoUnitario: item.productoId ? costoPorProducto.get(item.productoId) : undefined,
            })),
          },
          datosTransporteRemision: dto.datosTransporteRemision
            ? {
                create: {
                  ...dto.datosTransporteRemision,
                  fechaEmisionFacturaFutura: dto.datosTransporteRemision.fechaEmisionFacturaFutura
                    ? new Date(dto.datosTransporteRemision.fechaEmisionFacturaFutura)
                    : undefined,
                  fechaInicioTraslado: new Date(dto.datosTransporteRemision.fechaInicioTraslado),
                  fechaFinTraslado: new Date(dto.datosTransporteRemision.fechaFinTraslado),
                },
              }
            : undefined,
          datosVendedorAutofactura: dto.datosVendedorAutofactura
            ? { create: dto.datosVendedorAutofactura }
            : undefined,
        },
        include: { items: true },
      });

      if (tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA && dto.depositoId) {
        for (const item of actualizado.items) {
          if (!item.productoId) continue;
          const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (!producto?.controlaStock) continue;
          await this.stockService.registrarMovimiento(
            {
              productoId: item.productoId,
              depositoId: dto.depositoId,
              tipo: TipoMovimientoStock.VENTA,
              cantidad: Number(item.cantidad),
              comprobanteId: actualizado.id,
            },
            tx,
          );
        }
      }

      if (tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA) {
        await this.asientosContablesService.generarAsientoVenta(tx, actualizado, dto.formaPago, dto.cuentaBancariaId);
      }

      const esFacturaOAutofactura =
        tipoDocumento === TipoDocumentoElectronico.FACTURA_ELECTRONICA ||
        tipoDocumento === TipoDocumentoElectronico.AUTOFACTURA_ELECTRONICA;
      if (esFacturaOAutofactura && actualizado.condicionVenta === CondicionVenta.CONTADO && dto.formaPago) {
        const comprobantePago = await tx.comprobantePago.create({
          data: {
            comprobanteId: actualizado.id,
            formaPago: dto.formaPago,
            monto: subtotales.total,
            fecha: actualizado.fechaEmision,
            cuentaBancariaId: dto.cuentaBancariaId,
          },
        });

        if (dto.cuentaBancariaId) {
          await tx.movimientoBancario.create({
            data: {
              cuentaBancariaId: dto.cuentaBancariaId,
              fecha: actualizado.fechaEmision,
              concepto: `Venta ${tipoDocumento} Nº ${actualizado.numero}`,
              tipo: 'CREDITO',
              monto: subtotales.total,
              referencia: actualizado.numero,
              comprobantePagoId: comprobantePago.id,
            },
          });
        }
      }

      if (dto.clienteId && dto.condicionVenta === CondicionVenta.CREDITO) {
        const cuenta = await tx.cuentaCorriente.findUnique({ where: { terceroId: dto.clienteId } });
        if (!cuenta) throw new NotFoundException(`El cliente ${dto.clienteId} no tiene cuenta corriente`);

        const esNotaCredito = tipoDocumento === TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA;
        let fechaVencimiento: Date | undefined;
        if (!esNotaCredito) {
          const condicionPago = dto.condicionPagoId
            ? await tx.condicionPago.findUnique({ where: { id: dto.condicionPagoId } })
            : null;
          fechaVencimiento = new Date(actualizado.fechaEmision);
          fechaVencimiento.setDate(fechaVencimiento.getDate() + (condicionPago?.diasPlazo ?? 0));
        }

        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: cuenta.id,
            tipo: esNotaCredito ? TipoMovimientoCuentaCorriente.CREDITO : TipoMovimientoCuentaCorriente.DEBITO,
            monto: subtotales.total,
            concepto: `${tipoDocumento} Nº ${actualizado.numero}`,
            comprobanteId: actualizado.id,
            fechaVencimiento,
          },
          tx,
        );
      }

      return tx.comprobante.findUniqueOrThrow({
        where: { id },
        include: { items: true, cliente: true, proveedor: true },
      });
    });
  }

  // Libro de Ventas: formato general que usa la DNIT para el reporte de
  // ventas (RG 90) -- columnas con el desglose exento/gravado/IVA por
  // comprobante y una fila de totales al pie. Solo documentos de venta
  // (con clienteId), no compras/autofactura, que usan otra convencion.
  async generarLibroVentas(empresaId: string, desde: string, hasta: string): Promise<Buffer> {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T23:59:59.999`);

    const comprobantes = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        clienteId: { not: null },
        fechaEmision: { gte: desdeDate, lte: hastaDate },
      },
      include: {
        cliente: true,
        timbrado: { include: { puntoExpedicion: { include: { establecimiento: true } } } },
      },
      orderBy: { fechaEmision: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Libro de Ventas');

    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo Doc.', key: 'tipo', width: 10 },
      { header: 'Timbrado', key: 'timbrado', width: 12 },
      { header: 'Nº Comprobante', key: 'numero', width: 18 },
      { header: 'RUC/CI Cliente', key: 'docCliente', width: 16 },
      { header: 'Razón Social', key: 'cliente', width: 32 },
      { header: 'Cond. Venta', key: 'condicion', width: 12 },
      { header: 'Estado', key: 'estado', width: 10 },
      { header: 'Exentas', key: 'exenta', width: 14 },
      { header: 'Gravadas 5%', key: 'grav5', width: 14 },
      { header: 'Gravadas 10%', key: 'grav10', width: 14 },
      { header: 'IVA 5%', key: 'iva5', width: 12 },
      { header: 'IVA 10%', key: 'iva10', width: 12 },
      { header: 'Total', key: 'total', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    const montoCols = ['exenta', 'grav5', 'grav10', 'iva5', 'iva10', 'total'];

    const totales = { exenta: 0, grav5: 0, grav10: 0, iva5: 0, iva10: 0, total: 0 };

    for (const c of comprobantes) {
      const est = c.timbrado?.puntoExpedicion?.establecimiento;
      const pe = c.timbrado?.puntoExpedicion;
      const numeroCompleto = est && pe ? `${est.codigo}-${pe.codigo}-${c.numero}` : c.numero;

      const row = {
        fecha: c.fechaEmision.toLocaleDateString('es-PY'),
        tipo: TIPO_DOCUMENTO_ABREVIADO[c.tipoDocumento],
        timbrado: c.timbrado?.numeroTimbrado ?? '',
        numero: numeroCompleto,
        docCliente: c.cliente?.numeroDocumento ?? '',
        cliente: c.cliente?.razonSocial ?? '',
        condicion: c.condicionVenta,
        estado: c.estado,
        exenta: Number(c.subtotalExenta),
        grav5: Number(c.subtotalGravada5),
        grav10: Number(c.subtotalGravada10),
        iva5: Number(c.iva5),
        iva10: Number(c.iva10),
        total: Number(c.total),
      };
      sheet.addRow(row);

      // Los comprobantes anulados no suman al total (no representan una
      // venta efectiva), pero quedan listados en el detalle para que el
      // libro sea trazable.
      if (c.estado !== EstadoComprobante.ANULADO) {
        totales.exenta += row.exenta;
        totales.grav5 += row.grav5;
        totales.grav10 += row.grav10;
        totales.iva5 += row.iva5;
        totales.iva10 += row.iva10;
        totales.total += row.total;
      }
    }

    for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
      for (const key of montoCols) {
        row.getCell(key).numFmt = '#,##0';
      }
    }

    const totalRow = sheet.addRow({ cliente: 'TOTALES (excluye anulados)', ...totales });
    totalRow.font = { bold: true };
    for (const key of montoCols) {
      totalRow.getCell(key).numFmt = '#,##0';
    }
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' } };
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Rentabilidad de ventas: agrupa por producto la venta (total con IVA
  // incluido, mismo criterio que el resto del sistema) contra el costo
  // congelado en cada item al momento de emitir. Solo Factura Electronica
  // emitida cuenta como venta -- mismo criterio que el descuento de stock.
  async reporteRentabilidad(empresaId: string, desde: string, hasta: string) {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T23:59:59.999`);

    const comprobantes = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        tipoDocumento: TipoDocumentoElectronico.FACTURA_ELECTRONICA,
        estado: EstadoComprobante.EMITIDO,
        fechaEmision: { gte: desdeDate, lte: hastaDate },
      },
      include: { items: { include: { producto: true } } },
    });

    type Fila = { productoId: string; codigo: string; descripcion: string; cantidad: number; totalVenta: number; totalCosto: number };
    const porProducto = new Map<string, Fila>();
    let ventaSinCosto = 0;

    for (const comprobante of comprobantes) {
      for (const item of comprobante.items) {
        const totalItem = Number(item.total);
        if (!item.productoId || item.costoUnitario === null) {
          ventaSinCosto = round2(ventaSinCosto + totalItem);
          continue;
        }
        const costoTotal = round2(Number(item.costoUnitario) * Number(item.cantidad));
        const fila = porProducto.get(item.productoId) ?? {
          productoId: item.productoId,
          codigo: item.producto?.codigo ?? '',
          descripcion: item.descripcion,
          cantidad: 0,
          totalVenta: 0,
          totalCosto: 0,
        };
        fila.cantidad = round2(fila.cantidad + Number(item.cantidad));
        fila.totalVenta = round2(fila.totalVenta + totalItem);
        fila.totalCosto = round2(fila.totalCosto + costoTotal);
        porProducto.set(item.productoId, fila);
      }
    }

    const items = [...porProducto.values()]
      .map((fila) => {
        const margen = round2(fila.totalVenta - fila.totalCosto);
        return { ...fila, margen, margenPorcentual: fila.totalVenta ? round2((margen / fila.totalVenta) * 100) : 0 };
      })
      .sort((a, b) => b.margen - a.margen);

    const totalVenta = round2(items.reduce((s, i) => s + i.totalVenta, 0) + ventaSinCosto);
    const totalCosto = round2(items.reduce((s, i) => s + i.totalCosto, 0));
    const margen = round2(totalVenta - totalCosto);

    return {
      items,
      ventaSinCosto,
      totales: {
        totalVenta,
        totalCosto,
        margen,
        margenPorcentual: totalVenta ? round2((margen / totalVenta) * 100) : 0,
      },
    };
  }

  // KPIs + series para el panel de ventas (prototipo visual). Mismo criterio
  // que reporteRentabilidad: solo Factura Electronica emitida cuenta como venta.
  // Facturas a credito con vencimiento pasado y saldo todavia pendiente. El
  // vencimiento se calcula al vuelo (fechaEmision + condicionPago.diasPlazo)
  // en vez de depender del campo fechaVencimiento guardado en el movimiento
  // de cuenta corriente -- asi el listado tambien cubre comprobantes viejos,
  // emitidos antes de que ese campo empezara a completarse.
  async findVencidos(empresaId: string) {
    const comprobantes = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        condicionVenta: CondicionVenta.CREDITO,
        estado: EstadoComprobante.EMITIDO,
        tipoDocumento: { not: TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA },
        clienteId: { not: null },
      },
      include: { cliente: true, condicionPago: true },
    });
    if (comprobantes.length === 0) return [];

    const aplicaciones = await this.prisma.reciboAplicacion.groupBy({
      by: ['comprobanteId'],
      where: { comprobanteId: { in: comprobantes.map((c) => c.id) } },
      _sum: { montoAplicado: true },
    });
    const aplicadoPorComprobante = new Map(
      aplicaciones.map((a) => [a.comprobanteId, Number(a._sum.montoAplicado ?? 0)]),
    );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

    return comprobantes
      .map((c) => {
        const fechaVencimiento = new Date(c.fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (c.condicionPago?.diasPlazo ?? 0));
        const saldoPendiente = round2(Number(c.total) - (aplicadoPorComprobante.get(c.id) ?? 0));
        // Dias vencido en calendario (ignora la hora exacta de emision) -- si
        // no, una factura emitida a la tarde parece "vencer" con menos dias
        // de atraso que una emitida a la manana del mismo dia.
        const vencimientoMedianoche = new Date(fechaVencimiento);
        vencimientoMedianoche.setHours(0, 0, 0, 0);
        const diasVencido = Math.floor((hoy.getTime() - vencimientoMedianoche.getTime()) / MS_POR_DIA);
        return {
          id: c.id,
          numero: c.numero,
          tipoDocumento: c.tipoDocumento,
          fechaEmision: c.fechaEmision,
          fechaVencimiento,
          total: Number(c.total),
          saldoPendiente,
          diasVencido,
          cliente: { id: c.cliente!.id, razonSocial: c.cliente!.razonSocial, numeroDocumento: c.cliente!.numeroDocumento },
        };
      })
      .filter((c) => c.saldoPendiente > 0.01 && c.diasVencido > 0)
      .sort((a, b) => b.diasVencido - a.diasVencido);
  }

  async panelVentas(empresaId: string, desde: string, hasta: string) {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T23:59:59.999`);

    const comprobantes = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        tipoDocumento: TipoDocumentoElectronico.FACTURA_ELECTRONICA,
        estado: EstadoComprobante.EMITIDO,
        fechaEmision: { gte: desdeDate, lte: hastaDate },
      },
      include: { items: { include: { producto: true } } },
      orderBy: { fechaEmision: 'asc' },
    });

    const totalVentas = comprobantes.length;
    const montoTotal = round2(comprobantes.reduce((s, c) => s + Number(c.total), 0));
    const ticketPromedio = totalVentas ? round2(montoTotal / totalVentas) : 0;
    const enCredito = comprobantes.filter((c) => c.condicionVenta === 'CREDITO').length;
    const porcentajeCredito = totalVentas ? round2((enCredito / totalVentas) * 100) : 0;

    type FilaFecha = { fecha: string; cantidad: number; monto: number };
    const porFechaMap = new Map<string, FilaFecha>();
    for (const c of comprobantes) {
      const fecha = c.fechaEmision.toISOString().slice(0, 10);
      const fila = porFechaMap.get(fecha) ?? { fecha, cantidad: 0, monto: 0 };
      fila.cantidad += 1;
      fila.monto = round2(fila.monto + Number(c.total));
      porFechaMap.set(fecha, fila);
    }
    const porFecha = [...porFechaMap.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));

    type FilaProducto = { productoId: string; descripcion: string; cantidad: number; monto: number };
    const porProductoMap = new Map<string, FilaProducto>();
    for (const c of comprobantes) {
      for (const item of c.items) {
        const key = item.productoId ?? item.descripcion;
        const fila = porProductoMap.get(key) ?? { productoId: key, descripcion: item.descripcion, cantidad: 0, monto: 0 };
        fila.cantidad = round2(fila.cantidad + Number(item.cantidad));
        fila.monto = round2(fila.monto + Number(item.total));
        porProductoMap.set(key, fila);
      }
    }
    const porProducto = [...porProductoMap.values()].sort((a, b) => b.monto - a.monto).slice(0, 8);

    return {
      totalVentas,
      montoTotal,
      ticketPromedio,
      porcentajeCredito,
      porFecha,
      porProducto,
    };
  }

  async generarReporteRentabilidadExcel(empresaId: string, desde: string, hasta: string): Promise<Buffer> {
    const { items, ventaSinCosto, totales } = await this.reporteRentabilidad(empresaId, desde, hasta);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rentabilidad');

    sheet.columns = [
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Producto', key: 'descripcion', width: 34 },
      { header: 'Cantidad vendida', key: 'cantidad', width: 16 },
      { header: 'Venta total', key: 'totalVenta', width: 16 },
      { header: 'Costo total', key: 'totalCosto', width: 16 },
      { header: 'Margen', key: 'margen', width: 16 },
      { header: 'Margen %', key: 'margenPorcentual', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    const montoCols = ['totalVenta', 'totalCosto', 'margen'];
    for (const item of items) {
      const row = sheet.addRow(item);
      for (const key of montoCols) row.getCell(key).numFmt = '#,##0';
      row.getCell('margenPorcentual').numFmt = '0.0"%"';
    }

    if (ventaSinCosto > 0) {
      const row = sheet.addRow({ descripcion: 'Ítems libres / sin costo cargado (no incluidos en el margen)', totalVenta: ventaSinCosto });
      row.font = { italic: true };
      row.getCell('totalVenta').numFmt = '#,##0';
    }

    const totalRow = sheet.addRow({
      descripcion: 'TOTALES',
      totalVenta: totales.totalVenta,
      totalCosto: totales.totalCosto,
      margen: totales.margen,
      margenPorcentual: totales.margenPorcentual,
    });
    totalRow.font = { bold: true };
    for (const key of montoCols) totalRow.getCell(key).numFmt = '#,##0';
    totalRow.getCell('margenPorcentual').numFmt = '0.0"%"';
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' } };
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
