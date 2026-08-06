import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CondicionVenta,
  EstadoComprobante,
  TipoDocumentoElectronico,
  TipoMovimientoCuentaCorriente,
  TipoMovimientoStock,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { calcularItem, calcularSubtotales } from './comprobantes.util';

const NOTAS_QUE_REQUIEREN_MOTIVO: TipoDocumentoElectronico[] = [
  TipoDocumentoElectronico.NOTA_CREDITO_ELECTRONICA,
  TipoDocumentoElectronico.NOTA_DEBITO_ELECTRONICA,
];

@Injectable()
export class ComprobantesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
  ) {}

  async create(dto: CreateComprobanteDto) {
    if (NOTAS_QUE_REQUIEREN_MOTIVO.includes(dto.tipoDocumento) && !dto.motivoEmision) {
      throw new BadRequestException(
        `${dto.tipoDocumento} requiere motivoEmision (catalogo SIFEN de Nota de Credito/Debito)`,
      );
    }

    const itemsCalculados = dto.items.map((item) => ({ ...item, ...calcularItem(item) }));
    const subtotales = calcularSubtotales(itemsCalculados);

    return this.prisma.$transaction(async (tx) => {
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
          moneda: dto.moneda ?? 'PYG',
          tipoCambio: dto.tipoCambio,
          comprobanteAsociadoId: dto.comprobanteAsociadoId,
          motivoEmision: dto.motivoEmision,
          observacion: dto.observacion,
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
            })),
          },
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
}
