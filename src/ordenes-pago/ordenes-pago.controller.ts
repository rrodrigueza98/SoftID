import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { OrdenesPagoService } from './ordenes-pago.service';
import { CreateOrdenPagoDto } from './dto/create-orden-pago.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('COMPRAS')
@RequirePantalla('PROVEEDORES')
@Controller('ordenes-pago')
export class OrdenesPagoController {
  constructor(private readonly ordenesPagoService: OrdenesPagoService) {}

  @Post()
  create(@Body() dto: CreateOrdenPagoDto) {
    return this.ordenesPagoService.create(dto);
  }

  @Get()
  findAll(@Query('proveedorId') proveedorId?: string) {
    return this.ordenesPagoService.findAll(proveedorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordenesPagoService.findOne(id);
  }
}
