import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRolDto) {
    return this.prisma.rol.create({ data: { ...dto, permisos: dto.permisos ?? [] } });
  }

  findAll(empresaId: string) {
    return this.prisma.rol.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const rol = await this.prisma.rol.findUnique({ where: { id } });
    if (!rol) throw new NotFoundException(`Rol ${id} no encontrado`);
    return rol;
  }

  async update(id: string, dto: UpdateRolDto) {
    await this.findOne(id);
    return this.prisma.rol.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rol.delete({ where: { id } });
  }
}
