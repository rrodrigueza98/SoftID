import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CondicionVenta,
  EstadoComprobante,
  TipoDocumentoElectronico,
  TipoMovimientoCuentaCorriente,
  TipoMovimientoStock,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { AsientosContablesService } from '../contabilidad/asientos-contables.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly asientosContablesService: AsientosContablesService,
  ) {}

  async create(dto: CreateComprobanteDto) {
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

    return this.prisma.$transaction(async (tx) => {
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
        await this.asientosContablesService.generarAsientoVenta(tx, comprobante, dto.formaPago);
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
        await tx.comprobantePago.create({
          data: {
            comprobanteId: comprobante.id,
            formaPago: dto.formaPago,
            monto: subtotales.total,
            fecha: comprobante.fechaEmision,
          },
        });
      }

      if (dto.clienteId && dto.condicionVenta === CondicionVenta.CREDITO) {
        const cuenta = await tx.cuentaCorriente.findUnique({ where: { terceroId: dto.clienteId } });
        if (!cuenta) throw new NotFoundException(`El cliente ${dto.clienteId} no tiene cuenta corriente`);

        const esNotaCredito = dto.tipoDocumento === TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA;
        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: cuenta.id,
            tipo: esNotaCredito ? TipoMovimientoCuentaCorriente.CREDITO : TipoMovimientoCuentaCorriente.DEBITO,
            monto: subtotales.total,
            concepto: `${dto.tipoDocumento} Nº ${numero}`,
            comprobanteId: comprobante.id,
          },
          tx,
        );
      }

      return tx.comprobante.findUniqueOrThrow({
        where: { id: comprobante.id },
        include: { items: true, cliente: true, proveedor: true },
      });
    });
  }

  findAll(params: { empresaId: string; clienteId?: string; proveedorId?: string; tipoDocumento?: TipoDocumentoElectronico }) {
    const { empresaId, clienteId, proveedorId, tipoDocumento } = params;
    return this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...(clienteId ? { clienteId } : {}),
        ...(proveedorId ? { proveedorId } : {}),
        ...(tipoDocumento ? { tipoDocumento } : {}),
      },
      include: { items: true, cliente: true, proveedor: true },
      orderBy: { fechaEmision: 'desc' },
    });
  }

  async findOne(id: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id },
      include: {
        items: { include: { unidadMedida: true } },
        cliente: true,
        proveedor: true,
        pagos: true,
        movimientosStock: true,
        movimientosCuentaCorriente: true,
        documentoElectronico: true,
        empresa: true,
        timbrado: { include: { puntoExpedicion: { include: { establecimiento: true } } } },
        datosTransporteRemision: true,
      },
    });
    if (!comprobante) throw new NotFoundException(`Comprobante ${id} no encontrado`);
    return comprobante;
  }

  // Marca el comprobante como anulado. NO revierte automaticamente los
  // movimientos de stock o cuenta corriente que genero -- eso requiere un
  // criterio de negocio propio (nota de credito, contramovimiento manual,
  // etc.) que todavia no esta definido. Queda como paso manual a proposito.
  async anular(id: string) {
    const comprobante = await this.findOne(id);
    if (comprobante.estado === EstadoComprobante.ANULADO) {
      throw new BadRequestException('El comprobante ya esta anulado');
    }
    return this.prisma.comprobante.update({
      where: { id },
      data: { estado: EstadoComprobante.ANULADO },
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
