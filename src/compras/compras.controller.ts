import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

@RequireModulo('COMPRAS')
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  create(@Body() dto: CreateCompraDto) {
    return this.comprasService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string, @Query('proveedorId') proveedorId?: string) {
    return this.comprasService.findAll({ empresaId, proveedorId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprasService.findOne(id);
  }

  @Patch(':id/anular')
  anular(@Param('id') id: string) {
    return this.comprasService.anular(id);
  }
}
