import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SALT_ROUNDS = 10;

// Se selecciona explicitamente todo MENOS passwordHash -- asi es imposible
// que un endpoint de lectura lo filtre por descuido.
const USUARIO_SELECT = {
  id: true,
  empresaId: true,
  rolId: true,
  nombre: true,
  email: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  rol: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    const existente = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.usuario.create({
      data: {
        empresaId: dto.empresaId,
        rolId: dto.rolId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        activo: dto.activo,
      },
      select: USUARIO_SELECT,
    });
  }

  findAll(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: USUARIO_SELECT,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: USUARIO_SELECT });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findOne(id);
    return this.prisma.usuario.update({ where: { id }, data: dto, select: USUARIO_SELECT });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    const passwordValida = await bcrypt.compare(dto.passwordActual, usuario.passwordHash);
    if (!passwordValida) throw new BadRequestException('La contraseña actual no es correcta');

    const passwordHash = await bcrypt.hash(dto.passwordNueva, SALT_ROUNDS);
    await this.prisma.usuario.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  // Desactivar en vez de borrar: preserva la referencia historica de este
  // usuario en movimientos de stock / cuenta corriente que haya generado.
  async desactivar(id: string) {
    await this.findOne(id);
    return this.prisma.usuario.update({ where: { id }, data: { activo: false }, select: USUARIO_SELECT });
  }

  async activar(id: string) {
    await this.findOne(id);
    return this.prisma.usuario.update({ where: { id }, data: { activo: true }, select: USUARIO_SELECT });
  }
}
