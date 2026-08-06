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
import { EstablecimientosService } from './establecimientos.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';

@Controller('establecimientos')
export class EstablecimientosController {
  constructor(private readonly establecimientosService: EstablecimientosService) {}

  @Post()
  create(@Body() dto: CreateEstablecimientoDto) {
    return this.establecimientosService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId?: string) {
    return this.establecimientosService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.establecimientosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstablecimientoDto) {
    return this.establecimientosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.establecimientosService.remove(id);
  }
}
