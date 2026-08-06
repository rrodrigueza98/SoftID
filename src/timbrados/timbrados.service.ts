import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimbradoDto } from './dto/create-timbrado.dto';
import { UpdateTimbradoDto } from './dto/update-timbrado.dto';

@Injectable()
export class TimbradosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTimbradoDto) {
    return this.prisma.timbrado.create({ data: dto });
  }

  findAll(puntoExpedicionId?: string) {
    return this.prisma.timbrado.findMany({
      where: puntoExpedicionId ? { puntoExpedicionId } : undefined,
      orderBy: { fechaInicioVigencia: 'desc' },
    });
  }

  async findOne(id: string) {
    const timbrado = await this.prisma.timbrado.findUnique({ where: { id } });
    if (!timbrado) throw new NotFoundException(`Timbrado ${id} no encontrado`);
    return timbrado;
  }

  async update(id: string, dto: UpdateTimbradoDto) {
    await this.findOne(id);
    return this.prisma.timbrado.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.timbrado.delete({ where: { id } });
  }
}
