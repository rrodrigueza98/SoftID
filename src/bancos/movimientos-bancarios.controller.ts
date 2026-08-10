import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TipoMovimientoBancario } from '@prisma/client';
import { MovimientosBancariosService } from './movimientos-bancarios.service';
import { CreateMovimientoBancarioDto } from './dto/create-movimiento-bancario.dto';
import { SetConciliadoDto } from './dto/set-conciliado.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('BANCOS')
@Controller('movimientos-bancarios')
export class MovimientosBancariosController {
  constructor(private readonly movimientosBancariosService: MovimientosBancariosService) {}

  @Post()
  create(@Body() dto: CreateMovimientoBancarioDto) {
    return this.movimientosBancariosService.create(dto);
  }

  @Get()
  findAll(
    @Query('cuentaBancariaId') cuentaBancariaId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('conciliado') conciliado?: string,
    @Query('tipo') tipo?: TipoMovimientoBancario,
  ) {
    return this.movimientosBancariosService.findAll(cuentaBancariaId, {
      desde,
      hasta,
      conciliado: conciliado === undefined ? undefined : conciliado === 'true',
      tipo,
    });
  }

  @Patch(':id/conciliar')
  setConciliado(@Param('id') id: string, @Body() dto: SetConciliadoDto) {
    return this.movimientosBancariosService.setConciliado(id, dto.conciliado);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movimientosBancariosService.remove(id);
  }
}
