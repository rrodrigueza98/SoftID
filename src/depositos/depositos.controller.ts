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
import { DepositosService } from './depositos.service';
import { CreateDepositoDto } from './dto/create-deposito.dto';
import { UpdateDepositoDto } from './dto/update-deposito.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

// La lectura queda abierta a cualquier usuario autenticado -- Facturacion y
// POS necesitan poder elegir el deposito a descontar aunque el operador no
// tenga acceso al modulo Inventario.
@Controller('depositos')
export class DepositosController {
  constructor(private readonly depositosService: DepositosService) {}

  @RequireModulo('INVENTARIO')
  @Post()
  create(@Body() dto: CreateDepositoDto) {
    return this.depositosService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.depositosService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.depositosService.findOne(id);
  }

  @RequireModulo('INVENTARIO')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepositoDto) {
    return this.depositosService.update(id, dto);
  }

  @RequireModulo('INVENTARIO')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.depositosService.remove(id);
  }
}
