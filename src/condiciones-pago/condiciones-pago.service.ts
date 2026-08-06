import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCondicionPagoDto } from './dto/create-condicion-pago.dto';
import { UpdateCondicionPagoDto } from './dto/update-condicion-pago.dto';

@Injectable()
export class CondicionesPagoService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCondicionPagoDto) {
    return this.prisma.condicionPago.create({ data: dto });
  }

  findAll(empresaId?: string) {
    return this.prisma.condicionPago.findMany({
      where: empresaId ? { empresaId } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const condicionPago = await this.prisma.condicionPago.findUnique({ where: { id } });
    if (!condicionPago) throw new NotFoundException(`Condicion de pago ${id} no encontrada`);
    return condicionPago;
  }

  async update(id: string, dto: UpdateCondicionPagoDto) {
    await this.findOne(id);
    return this.prisma.condicionPago.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.condicionPago.delete({ where: { id } });
  }
}
