import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoTercero } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerceroDto } from './dto/create-tercero.dto';
import { UpdateTerceroDto } from './dto/update-tercero.dto';

@Injectable()
export class TercerosService {
  constructor(private readonly prisma: PrismaService) {}

  // Cada tercero nuevo recibe su cuenta corriente en el mismo alta -- es 1:1
  // y no tiene sentido operar un tercero sin ella.
  create(dto: CreateTerceroDto) {
    return this.prisma.tercero.create({
      data: {
        ...dto,
        cuentaCorriente: { create: { limiteCredito: dto.limiteCredito } },
      },
      include: { cuentaCorriente: true },
    });
  }

  findAll(params: { empresaId: string; tipo?: TipoTercero; search?: string }) {
    const { empresaId, tipo, search } = params;
    const where: Prisma.TerceroWhereInput = {
      empresaId,
      ...(tipo ? { tipo } : {}),
      ...(search
        ? {
            OR: [
              { razonSocial: { contains: search, mode: 'insensitive' } },
              { nombreFantasia: { contains: search, mode: 'insensitive' } },
              { numeroDocumento: { contains: search } },
            ],
          }
        : {}),
    };
    return this.prisma.tercero.findMany({
      where,
      include: { cuentaCorriente: true },
      orderBy: { razonSocial: 'asc' },
    });
  }

  async findOne(id: string) {
    const tercero = await this.prisma.tercero.findUnique({
      where: { id },
      include: { contactos: true, cuentaCorriente: true, condicionPago: true },
    });
    if (!tercero) throw new NotFoundException(`Tercero ${id} no encontrado`);
    return tercero;
  }

  async update(id: string, dto: UpdateTerceroDto) {
    await this.findOne(id);
    return this.prisma.tercero.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tercero.delete({ where: { id } });
  }
}
