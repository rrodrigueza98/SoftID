import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { UpdateCategoriaProductoDto } from './dto/update-categoria-producto.dto';

@Injectable()
export class CategoriasProductoService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCategoriaProductoDto) {
    return this.prisma.categoriaProducto.create({ data: dto });
  }

  findAll(empresaId: string) {
    return this.prisma.categoriaProducto.findMany({
      where: { empresaId },
      include: { subcategorias: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoriaProducto.findUnique({
      where: { id },
      include: { subcategorias: true },
    });
    if (!categoria) throw new NotFoundException(`Categoria ${id} no encontrada`);
    return categoria;
  }

  async update(id: string, dto: UpdateCategoriaProductoDto) {
    await this.findOne(id);
    return this.prisma.categoriaProducto.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoriaProducto.delete({ where: { id } });
  }
}
