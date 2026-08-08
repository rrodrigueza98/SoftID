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
import { PuntosExpedicionService } from './puntos-expedicion.service';
import { CreatePuntoExpedicionDto } from './dto/create-punto-expedicion.dto';
import { UpdatePuntoExpedicionDto } from './dto/update-punto-expedicion.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('puntos-expedicion')
export class PuntosExpedicionController {
  constructor(private readonly puntosExpedicionService: PuntosExpedicionService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreatePuntoExpedicionDto) {
    return this.puntosExpedicionService.create(dto);
  }

  @Get()
  findAll(@Query('establecimientoId') establecimientoId?: string) {
    return this.puntosExpedicionService.findAll(establecimientoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.puntosExpedicionService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePuntoExpedicionDto) {
    return this.puntosExpedicionService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.puntosExpedicionService.remove(id);
  }
}
