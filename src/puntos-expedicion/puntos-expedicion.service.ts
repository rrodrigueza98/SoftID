import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePuntoExpedicionDto } from './dto/create-punto-expedicion.dto';
import { UpdatePuntoExpedicionDto } from './dto/update-punto-expedicion.dto';

@Injectable()
export class PuntosExpedicionService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePuntoExpedicionDto) {
    return this.prisma.puntoExpedicion.create({ data: dto });
  }

  findAll(establecimientoId?: string) {
    return this.prisma.puntoExpedicion.findMany({
      where: establecimientoId ? { establecimientoId } : undefined,
      include: { timbrados: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const puntoExpedicion = await this.prisma.puntoExpedicion.findUnique({
      where: { id },
      include: { timbrados: true },
    });
    if (!puntoExpedicion) throw new NotFoundException(`Punto de expedicion ${id} no encontrado`);
    return puntoExpedicion;
  }

  async update(id: string, dto: UpdatePuntoExpedicionDto) {
    await this.findOne(id);
    return this.prisma.puntoExpedicion.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.puntoExpedicion.delete({ where: { id } });
  }
}
