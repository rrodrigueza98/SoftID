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
import { TipoTercero } from '@prisma/client';
import { TercerosService } from './terceros.service';
import { CreateTerceroDto } from './dto/create-tercero.dto';
import { UpdateTerceroDto } from './dto/update-tercero.dto';

@Controller('terceros')
export class TercerosController {
  constructor(private readonly tercerosService: TercerosService) {}

  @Post()
  create(@Body() dto: CreateTerceroDto) {
    return this.tercerosService.create(dto);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @Query('tipo') tipo?: TipoTercero,
    @Query('search') search?: string,
  ) {
    return this.tercerosService.findAll({ empresaId, tipo, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tercerosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTerceroDto) {
    return this.tercerosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tercerosService.remove(id);
  }
}
