import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateMovimientoCCDto } from './dto/create-movimiento-cc.dto';

@Controller()
export class CuentasCorrientesController {
  constructor(private readonly cuentasCorrientesService: CuentasCorrientesService) {}

  @Get('cuentas-corrientes')
  findByTercero(@Query('terceroId') terceroId: string) {
    return this.cuentasCorrientesService.findByTercero(terceroId);
  }

  @Get('cuentas-corrientes/:id/movimientos')
  findMovimientos(@Param('id') id: string) {
    return this.cuentasCorrientesService.findMovimientos(id);
  }

  @Post('movimientos-cuenta-corriente')
  registrarMovimiento(@Body() dto: CreateMovimientoCCDto) {
    return this.cuentasCorrientesService.registrarMovimientoManual(dto);
  }
}
