import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateMovimientoCCDto } from './dto/create-movimiento-cc.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

// VENTAS+CUENTAS_CORRIENTES para clientes, COMPRAS+PROVEEDORES para
// proveedores -- el service es agnostico del tipo de tercero, asi que
// alcanza con aceptar cualquiera de los dos combos (match OR).
@RequireModulo('VENTAS', 'COMPRAS')
@RequirePantalla('CUENTAS_CORRIENTES', 'PROVEEDORES')
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
