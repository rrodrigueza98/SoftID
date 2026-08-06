import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';

@Injectable()
export class EstablecimientosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEstablecimientoDto) {
    return this.prisma.establecimiento.create({ data: dto });
  }

  findAll(empresaId?: string) {
    return this.prisma.establecimiento.findMany({
      where: empresaId ? { empresaId } : undefined,
      include: { puntosExpedicion: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const establecimiento = await this.prisma.establecimiento.findUnique({
      where: { id },
      include: { puntosExpedicion: true },
    });
    if (!establecimiento) throw new NotFoundException(`Establecimiento ${id} no encontrado`);
    return establecimiento;
  }

  async update(id: string, dto: UpdateEstablecimientoDto) {
    await this.findOne(id);
    return this.prisma.establecimiento.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.establecimiento.delete({ where: { id } });
  }
}
