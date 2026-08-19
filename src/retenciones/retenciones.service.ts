import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRetencionIvaDto } from './dto/create-retencion-iva.dto';

@Injectable()
export class RetencionesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRetencionIvaDto) {
    return this.prisma.retencionIva.create({
      data: { ...dto, fecha: new Date(dto.fecha) },
    });
  }

  findAll(params: { empresaId: string; periodoTributario?: string }) {
    const { empresaId, periodoTributario } = params;
    return this.prisma.retencionIva.findMany({
      where: { empresaId, ...(periodoTributario ? { periodoTributario } : {}) },
      include: { comprobante: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async remove(id: string) {
    const retencion = await this.prisma.retencionIva.findUnique({ where: { id } });
    if (!retencion) throw new NotFoundException(`Retención ${id} no encontrada`);
    return this.prisma.retencionIva.delete({ where: { id } });
  }
}
