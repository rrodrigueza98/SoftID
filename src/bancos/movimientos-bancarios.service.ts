import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimientoBancario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovimientoBancarioDto } from './dto/create-movimiento-bancario.dto';

@Injectable()
export class MovimientosBancariosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMovimientoBancarioDto) {
    return this.prisma.movimientoBancario.create({
      data: {
        cuentaBancariaId: dto.cuentaBancariaId,
        fecha: new Date(dto.fecha),
        concepto: dto.concepto,
        tipo: dto.tipo,
        monto: dto.monto,
        referencia: dto.referencia,
      },
    });
  }

  findAll(
    cuentaBancariaId: string,
    filtros: { desde?: string; hasta?: string; conciliado?: boolean; tipo?: TipoMovimientoBancario } = {},
  ) {
    const where: Prisma.MovimientoBancarioWhereInput = {
      cuentaBancariaId,
      ...(filtros.desde || filtros.hasta
        ? { fecha: { ...(filtros.desde ? { gte: new Date(filtros.desde) } : {}), ...(filtros.hasta ? { lte: new Date(filtros.hasta) } : {}) } }
        : {}),
      ...(filtros.conciliado !== undefined ? { conciliado: filtros.conciliado } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
    return this.prisma.movimientoBancario.findMany({ where, orderBy: { fecha: 'desc' } });
  }

  async findOne(id: string) {
    const movimiento = await this.prisma.movimientoBancario.findUnique({ where: { id } });
    if (!movimiento) throw new NotFoundException(`Movimiento bancario ${id} no encontrado`);
    return movimiento;
  }

  async setConciliado(id: string, conciliado: boolean) {
    await this.findOne(id);
    return this.prisma.movimientoBancario.update({
      where: { id },
      data: { conciliado, fechaConciliacion: conciliado ? new Date() : null },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.movimientoBancario.delete({ where: { id } });
  }
}
