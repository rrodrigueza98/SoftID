import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositoDto } from './dto/create-deposito.dto';
import { UpdateDepositoDto } from './dto/update-deposito.dto';

@Injectable()
export class DepositosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDepositoDto) {
    return this.prisma.deposito.create({ data: dto });
  }

  findAll(empresaId: string) {
    return this.prisma.deposito.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const deposito = await this.prisma.deposito.findUnique({ where: { id } });
    if (!deposito) throw new NotFoundException(`Deposito ${id} no encontrado`);
    return deposito;
  }

  async update(id: string, dto: UpdateDepositoDto) {
    await this.findOne(id);
    return this.prisma.deposito.update({ where: { id }, data: dto });
  }

  // Si el deposito tiene stock o movimientos, el PrismaExceptionFilter global
  // convierte la violacion de FK en un 400 legible -- un deposito vacio
  // creado por error se borra limpio, uno con historial no.
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.deposito.delete({ where: { id } });
  }
}
