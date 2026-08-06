import { Module } from '@nestjs/common';
import { CategoriasProductoService } from './categorias-producto.service';
import { CategoriasProductoController } from './categorias-producto.controller';

@Module({
  controllers: [CategoriasProductoController],
  providers: [CategoriasProductoService],
})
export class CategoriasProductoModule {}
