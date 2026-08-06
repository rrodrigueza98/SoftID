import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactoTerceroDto } from './dto/create-contacto-tercero.dto';
import { UpdateContactoTerceroDto } from './dto/update-contacto-tercero.dto';

@Injectable()
export class ContactosTerceroService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContactoTerceroDto) {
    return this.prisma.contactoTercero.create({ data: dto });
  }

  findAll(terceroId: string) {
    return this.prisma.contactoTercero.findMany({
      where: { terceroId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const contacto = await this.prisma.contactoTercero.findUnique({ where: { id } });
    if (!contacto) throw new NotFoundException(`Contacto ${id} no encontrado`);
    return contacto;
  }

  async update(id: string, dto: UpdateContactoTerceroDto) {
    await this.findOne(id);
    return this.prisma.contactoTercero.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contactoTercero.delete({ where: { id } });
  }
}
