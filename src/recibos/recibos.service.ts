import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimientoCuentaCorriente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasCorrientesService } from '../cuentas-corrientes/cuentas-corrientes.service';
import { AsientosContablesService } from '../contabilidad/asientos-contables.service';
import { CreateReciboDto } from './dto/create-recibo.dto';

@Injectable()
export class RecibosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientesService: CuentasCorrientesService,
    private readonly asientosContablesService: AsientosContablesService,
  ) {}

  async create(dto: CreateReciboDto) {
    const aplicaciones = dto.aplicaciones ?? [];
    const totalAplicado = aplicaciones.reduce((sum, a) => sum + a.montoAplicado, 0);
    if (totalAplicado > dto.monto) {
      throw new BadRequestException(
        `El total aplicado (${totalAplicado}) no puede superar el monto del recibo (${dto.monto})`,
      );
    }

    const cuenta = await this.prisma.cuentaCorriente.findUnique({ where: { terceroId: dto.terceroId } });
    if (!cuenta) throw new NotFoundException(`El tercero ${dto.terceroId} no tiene cuenta corriente`);

    return this.prisma.$transaction(async (tx) => {
      // Igual que el numero de Comprobante: sale siempre del contador de la
      // empresa, nunca lo manda el cliente, para que no se salteen ni se
      // repitan numeros de recibo.
      const empresa = await tx.empresa.findUniqueOrThrow({ where: { id: dto.empresaId } });
      const numero = String(empresa.proximoNumeroRecibo).padStart(7, '0');
      await tx.empresa.update({
        where: { id: dto.empresaId },
        data: { proximoNumeroRecibo: { increment: 1 } },
      });

      const recibo = await tx.recibo.create({
        data: {
          empresaId: dto.empresaId,
          terceroId: dto.terceroId,
          numero,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          monto: dto.monto,
          formaPago: dto.formaPago,
          observacion: dto.observacion,
        },
      });

      await this.cuentasCorrientesService.registrarMovimiento(
        {
          cuentaCorrienteId: cuenta.id,
          tipo: TipoMovimientoCuentaCorriente.CREDITO,
          monto: dto.monto,
          concepto: `Recibo Nº ${numero}`,
          reciboId: recibo.id,
        },
        tx,
      );

      if (aplicaciones.length > 0) {
        await tx.reciboAplicacion.createMany({
          data: aplicaciones.map((a) => ({
            reciboId: recibo.id,
            comprobanteId: a.comprobanteId,
            montoAplicado: a.montoAplicado,
          })),
        });
      }

      await this.asientosContablesService.generarAsientoCobro(tx, recibo);

      return tx.recibo.findUniqueOrThrow({
        where: { id: recibo.id },
        include: { aplicaciones: true },
      });
    });
  }

  findAll(terceroId?: string) {
    return this.prisma.recibo.findMany({
      where: terceroId ? { terceroId } : undefined,
      include: { aplicaciones: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const recibo = await this.prisma.recibo.findUnique({
      where: { id },
      include: { aplicaciones: { include: { comprobante: true } }, tercero: true, empresa: true },
    });
    if (!recibo) throw new NotFoundException(`Recibo ${id} no encontrado`);
    return recibo;
  }
}
