import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimientoCuentaCorriente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { AsientosContablesService } from '../contabilidad/asientos-contables.service';
import { CreateOrdenPagoDto } from './dto/create-orden-pago.dto';

@Injectable()
export class OrdenesPagoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly asientosContablesService: AsientosContablesService,
  ) {}

  async create(dto: CreateOrdenPagoDto) {
    const aplicaciones = dto.aplicaciones ?? [];
    const totalAplicado = aplicaciones.reduce((sum, a) => sum + a.montoAplicado, 0);
    if (totalAplicado > dto.monto) {
      throw new BadRequestException(
        `El total aplicado (${totalAplicado}) no puede superar el monto de la orden de pago (${dto.monto})`,
      );
    }

    const cuenta = await this.prisma.cuentaCorriente.findUnique({ where: { terceroId: dto.proveedorId } });
    if (!cuenta) throw new NotFoundException(`El proveedor ${dto.proveedorId} no tiene cuenta corriente`);

    return this.prisma.$transaction(async (tx) => {
      // Mismo criterio que Recibo: el numero sale siempre del contador de
      // la empresa, nunca lo manda el cliente.
      const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: dto.empresaId } });
      const numero = String(empresa.proximoNumeroOrdenPago).padStart(7, '0');
      await tx.empresa.update({
        where: { id: dto.empresaId },
        data: { proximoNumeroOrdenPago: { increment: 1 } },
      });

      const ordenPago = await tx.ordenPago.create({
        data: {
          empresaId: dto.empresaId,
          proveedorId: dto.proveedorId,
          numero,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          monto: dto.monto,
          formaPago: dto.formaPago,
          observacion: dto.observacion,
          cuentaBancariaId: dto.cuentaBancariaId,
        },
      });

      // Si no se eligio cuenta bancaria, se asume que salio de Caja
      // (efectivo) -- no genera movimiento en Bancos, solo el asiento.
      if (dto.cuentaBancariaId) {
        await tx.movimientoBancario.create({
          data: {
            cuentaBancariaId: dto.cuentaBancariaId,
            fecha: ordenPago.fecha,
            concepto: `Pago Orden Nº ${numero}`,
            tipo: 'DEBITO',
            monto: dto.monto,
            referencia: numero,
            ordenPagoId: ordenPago.id,
          },
        });
      }

      // DEBITO reduce la deuda con el proveedor (el saldo de su cuenta
      // corriente vuelve hacia 0) -- ver comentario en CuentasCorrientesService.
      await this.cuentasCorrientesService.registrarMovimiento(
        {
          cuentaCorrienteId: cuenta.id,
          tipo: TipoMovimientoCuentaCorriente.DEBITO,
          monto: dto.monto,
          concepto: `Orden de Pago Nº ${numero}`,
          ordenPagoId: ordenPago.id,
        },
        tx,
      );

      if (aplicaciones.length > 0) {
        await tx.ordenPagoAplicacion.createMany({
          data: aplicaciones.map((a) => ({
            ordenPagoId: ordenPago.id,
            compraId: a.compraId,
            montoAplicado: a.montoAplicado,
          })),
        });
      }

      await this.asientosContablesService.generarAsientoPago(tx, ordenPago);

      return tx.ordenPago.findUniqueOrThrow({
        where: { id: ordenPago.id },
        include: { aplicaciones: true },
      });
    });
  }

  findAll(proveedorId?: string) {
    return this.prisma.ordenPago.findMany({
      where: proveedorId ? { proveedorId } : undefined,
      include: { aplicaciones: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const ordenPago = await this.prisma.ordenPago.findUnique({
      where: { id },
      include: { aplicaciones: { include: { compra: true } }, proveedor: true, empresa: true },
    });
    if (!ordenPago) throw new NotFoundException(`Orden de pago ${id} no encontrada`);
    return ordenPago;
  }
}
