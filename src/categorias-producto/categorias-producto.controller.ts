import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoriasProductoService } from './categorias-producto.service';
import { CreateCategoriaProductoDto } from './dto/create-categoria-producto.dto';
import { UpdateCategoriaProductoDto } from './dto/update-categoria-producto.dto';

@Controller('categorias-producto')
export class CategoriasProductoController {
  constructor(private readonly categoriasProductoService: CategoriasProductoService) {}

  @Post()
  create(@Body() dto: CreateCategoriaProductoDto) {
    return this.categoriasProductoService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.categoriasProductoService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriasProductoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaProductoDto) {
    return this.categoriasProductoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriasProductoService.remove(id);
  }
}
