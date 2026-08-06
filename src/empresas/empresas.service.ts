import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEmpresaDto) {
    return this.prisma.empresa.create({ data: dto });
  }

  findAll() {
    return this.prisma.empresa.findMany({ orderBy: { razonSocial: 'asc' } });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: { establecimientos: { include: { puntosExpedicion: true } } },
    });
    if (!empresa) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return empresa;
  }

  async update(id: string, dto: UpdateEmpresaDto) {
    await this.findOne(id);
    return this.prisma.empresa.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.empresa.delete({ where: { id } });
  }
}
