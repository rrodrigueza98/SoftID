import { BadRequestException, Injectable } from '@nestjs/common';
import { Comprobante, ComprobanteItem, OrigenAsiento, Prisma, Recibo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAsientoContableDto } from './dto/create-asiento-contable.dto';
import { esFormaPagoBancaria, MapeoContable } from './mapeo-contable';

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

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: dto.empresaId } });
      const numero = empresa.proximoNumeroAsiento;
      await tx.empresa.update({ where: { id: dto.empresaId }, data: { proximoNumeroAsiento: { increment: 1 } } });

      return tx.asientoContable.create({
        data: {
          empresaId: dto.empresaId,
          numero,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          concepto: dto.concepto,
          origen: OrigenAsiento.MANUAL,
          detalles: { create: dto.detalles.map((d) => ({ cuentaId: d.cuentaId, debe: d.debe, haber: d.haber, glosa: d.glosa })) },
        },
        include: { detalles: { include: { cuenta: true } } },
      });
    });
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
}
