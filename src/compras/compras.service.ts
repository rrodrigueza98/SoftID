import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CondicionVenta, EstadoComprobante, TipoMovimientoCuentaCorriente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { AsientosContablesService } from '../contabilidad/asientos-contables.service';
import { CreateCompraDto } from './dto/create-compra.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly asientosContablesService: AsientosContablesService,
  ) {}

  async create(dto: CreateCompraDto) {
    const montoExenta = round2(dto.montoExenta ?? 0);
    const montoGravada10 = round2(dto.montoGravada10 ?? 0);
    const montoGravada5 = round2(dto.montoGravada5 ?? 0);
    // Los montos "gravada" que tipea el usuario son la base imponible (sin
    // IVA), tal como figuran en la factura del proveedor -- mismo criterio
    // que quedo fijado para el Libro de Ventas (RG 90): Total = Exenta +
    // Gravada + IVA, sin duplicar el IVA adentro de la gravada.
    const iva10 = round2(montoGravada10 * 0.1);
    const iva5 = round2(montoGravada5 * 0.05);
    const total = round2(montoExenta + montoGravada10 + montoGravada5 + iva10 + iva5);
    if (total <= 0) {
      throw new BadRequestException('El total de la compra debe ser mayor a cero');
    }

    return this.prisma.$transaction(async (tx) => {
      const compra = await tx.compra.create({
        data: {
          empresaId: dto.empresaId,
          proveedorId: dto.proveedorId,
          numeroComprobante: dto.numeroComprobante,
          timbradoProveedor: dto.timbradoProveedor,
          fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : undefined,
          concepto: dto.concepto,
          cuentaContableId: dto.cuentaContableId,
          condicionCompra: dto.condicionCompra ?? CondicionVenta.CONTADO,
          formaPago: dto.formaPago,
          montoExenta,
          montoGravada10,
          montoGravada5,
          iva10,
          iva5,
          total,
          observacion: dto.observacion,
          estado: EstadoComprobante.EMITIDO,
        },
      });

      // Cuenta corriente del proveedor: mismo modelo que clientes, pero con
      // el signo invertido -- saldo negativo significa "nosotros les
      // debemos". Una compra a credito resta saldo (CREDITO); un pago que
      // les hagamos (todavia no implementado) lo sumaria de vuelta (DEBITO).
      if (compra.condicionCompra === CondicionVenta.CREDITO) {
        const cuenta = await tx.cuentaCorriente.findUnique({ where: { terceroId: compra.proveedorId } });
        if (!cuenta) throw new NotFoundException(`El proveedor ${compra.proveedorId} no tiene cuenta corriente`);
        await this.cuentasCorrientesService.registrarMovimiento(
          {
            cuentaCorrienteId: cuenta.id,
            tipo: TipoMovimientoCuentaCorriente.CREDITO,
            monto: total,
            concepto: `Compra Nº ${compra.numeroComprobante}`,
          },
          tx,
        );
      }

      await this.asientosContablesService.generarAsientoCompra(tx, compra);

      return tx.compra.findUniqueOrThrow({
        where: { id: compra.id },
        include: { proveedor: true, cuentaContable: true },
      });
    });
  }

  findAll(params: { empresaId: string; proveedorId?: string }) {
    const { empresaId, proveedorId } = params;
    return this.prisma.compra.findMany({
      where: { empresaId, ...(proveedorId ? { proveedorId } : {}) },
      include: { proveedor: true, cuentaContable: true },
      orderBy: { fechaEmision: 'desc' },
    });
  }

  async findOne(id: string) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: { proveedor: true, cuentaContable: true, asientosContables: { include: { detalles: { include: { cuenta: true } } } } },
    });
    if (!compra) throw new NotFoundException(`Compra ${id} no encontrada`);
    return compra;
  }

  // KPIs + series para el panel de compras (prototipo visual), mismo
  // criterio que ComprobantesService.panelVentas.
  async panelCompras(empresaId: string, desde: string, hasta: string) {
    const desdeDate = new Date(`${desde}T00:00:00`);
    const hastaDate = new Date(`${hasta}T23:59:59.999`);

    const compras = await this.prisma.compra.findMany({
      where: {
        empresaId,
        estado: EstadoComprobante.EMITIDO,
        fechaEmision: { gte: desdeDate, lte: hastaDate },
      },
      include: { proveedor: true },
      orderBy: { fechaEmision: 'asc' },
    });

    const totalCompras = compras.length;
    const montoTotal = round2(compras.reduce((s, c) => s + Number(c.total), 0));
    const ticketPromedio = totalCompras ? round2(montoTotal / totalCompras) : 0;
    const enCredito = compras.filter((c) => c.condicionCompra === 'CREDITO').length;
    const porcentajeCredito = totalCompras ? round2((enCredito / totalCompras) * 100) : 0;

    type FilaFecha = { fecha: string; cantidad: number; monto: number };
    const porFechaMap = new Map<string, FilaFecha>();
    for (const c of compras) {
      const fecha = c.fechaEmision.toISOString().slice(0, 10);
      const fila = porFechaMap.get(fecha) ?? { fecha, cantidad: 0, monto: 0 };
      fila.cantidad += 1;
      fila.monto = round2(fila.monto + Number(c.total));
      porFechaMap.set(fecha, fila);
    }
    const porFecha = [...porFechaMap.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));

    type FilaProveedor = { proveedorId: string; razonSocial: string; cantidad: number; monto: number };
    const porProveedorMap = new Map<string, FilaProveedor>();
    for (const c of compras) {
      const fila = porProveedorMap.get(c.proveedorId) ?? {
        proveedorId: c.proveedorId,
        razonSocial: c.proveedor.razonSocial,
        cantidad: 0,
        monto: 0,
      };
      fila.cantidad += 1;
      fila.monto = round2(fila.monto + Number(c.total));
      porProveedorMap.set(c.proveedorId, fila);
    }
    const porProveedor = [...porProveedorMap.values()].sort((a, b) => b.monto - a.monto).slice(0, 8);

    return {
      totalCompras,
      montoTotal,
      ticketPromedio,
      porcentajeCredito,
      porFecha,
      porProveedor,
    };
  }

  // No revierte automaticamente el movimiento de cuenta corriente ni el
  // asiento contable que genero -- mismo criterio deliberado que anular() en
  // ComprobantesService (requiere un contramovimiento manual con su propio
  // criterio de negocio).
  async anular(id: string) {
    const compra = await this.findOne(id);
    if (compra.estado === EstadoComprobante.ANULADO) {
      throw new BadRequestException('La compra ya esta anulada');
    }
    return this.prisma.compra.update({ where: { id }, data: { estado: EstadoComprobante.ANULADO } });
  }
}
