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
