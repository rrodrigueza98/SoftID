import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComprobantePagoDto } from './dto/create-comprobante-pago.dto';

@Injectable()
export class ComprobantePagosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateComprobantePagoDto) {
    return this.prisma.comprobantePago.create({
      data: { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined },
    });
  }

  findAll(comprobanteId: string) {
    return this.prisma.comprobantePago.findMany({
      where: { comprobanteId },
      orderBy: { fecha: 'desc' },
    });
  }

  async remove(id: string) {
    const pago = await this.prisma.comprobantePago.findUnique({ where: { id } });
    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
    return this.prisma.comprobantePago.delete({ where: { id } });
  }
}
