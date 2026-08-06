import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductoDto) {
    return this.prisma.producto.create({ data: dto });
  }

  findAll(params: { empresaId: string; categoriaId?: string; search?: string }) {
    const { empresaId, categoriaId, search } = params;
    const where: Prisma.ProductoWhereInput = {
      empresaId,
      ...(categoriaId ? { categoriaId } : {}),
      ...(search
        ? {
            OR: [
              { descripcion: { contains: search, mode: 'insensitive' } },
              { codigo: { contains: search, mode: 'insensitive' } },
              { codigoBarra: { contains: search } },
            ],
          }
        : {}),
    };
    return this.prisma.producto.findMany({
      where,
      include: { categoria: true, unidadMedida: true },
      orderBy: { descripcion: 'asc' },
    });
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, unidadMedida: true, stocks: { include: { deposito: true } } },
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    return producto;
  }

  async update(id: string, dto: UpdateProductoDto) {
    await this.findOne(id);
    return this.prisma.producto.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.producto.delete({ where: { id } });
  }
}
