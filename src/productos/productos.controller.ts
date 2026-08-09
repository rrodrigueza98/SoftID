import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

@RequireModulo('INVENTARIO')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('search') search?: string,
  ) {
    return this.productosService.findAll({ empresaId, categoriaId, search });
  }

  @Get('plantilla-excel')
  async plantillaExcel(@Query('empresaId') empresaId: string, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.productosService.generarPlantillaExcel(empresaId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-productos.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('importar-excel')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importarExcel(@Query('empresaId') empresaId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.productosService.importarExcel(empresaId, file.buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
