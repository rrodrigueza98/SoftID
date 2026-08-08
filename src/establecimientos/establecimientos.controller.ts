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
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('establecimientos')
export class EstablecimientosController {
  constructor(private readonly establecimientosService: EstablecimientosService) {}

  // La lectura queda abierta a cualquier usuario autenticado -- Facturacion
  // necesita el establecimiento/punto de expedicion para emitir. Solo crear,
  // editar y borrar (configuracion fiscal) quedan reservados a ADMIN.
  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstablecimientoDto) {
    return this.establecimientosService.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.establecimientosService.remove(id);
  }
}
