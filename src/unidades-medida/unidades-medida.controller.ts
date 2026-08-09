import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

// La lectura queda abierta a cualquier usuario autenticado -- Facturacion y
// POS necesitan el catalogo de unidades para cargar items aunque el
// operador no tenga acceso al modulo Inventario.
@Controller('unidades-medida')
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @RequireModulo('INVENTARIO')
  @RequirePantalla('PRODUCTOS')
  @Post()
  create(@Body() dto: CreateUnidadMedidaDto) {
    return this.unidadesMedidaService.create(dto);
  }

  @Get()
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unidadesMedidaService.findOne(id);
  }

  @RequireModulo('INVENTARIO')
  @RequirePantalla('PRODUCTOS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnidadMedidaDto) {
    return this.unidadesMedidaService.update(id, dto);
  }

  @RequireModulo('INVENTARIO')
  @RequirePantalla('PRODUCTOS')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(id);
  }
}
