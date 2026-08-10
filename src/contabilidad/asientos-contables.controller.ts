import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { AsientosContablesService } from './asientos-contables.service';
import { CreateAsientoContableDto } from './dto/create-asiento-contable.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('CONTABILIDAD')
@Controller('asientos-contables')
export class AsientosContablesController {
  constructor(private readonly asientosContablesService: AsientosContablesService) {}

  @Post()
  create(@Body() dto: CreateAsientoContableDto) {
    return this.asientosContablesService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.asientosContablesService.findAll({ empresaId, desde, hasta });
  }

  @Get('libro-mayor/:cuentaId')
  libroMayor(
    @Param('cuentaId') cuentaId: string,
    @Query('empresaId') empresaId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.asientosContablesService.libroMayor({ empresaId, cuentaId, desde, hasta });
  }

  @Get('balance-sumas-saldos')
  balanceSumasSaldos(@Query('empresaId') empresaId: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.asientosContablesService.balanceSumasSaldos({ empresaId, desde, hasta });
  }

  @Get('estado-resultados')
  estadoResultados(@Query('empresaId') empresaId: string, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    return this.asientosContablesService.estadoResultados({ empresaId, desde, hasta });
  }

  @Get('estado-situacion-financiera')
  estadoSituacionFinanciera(@Query('empresaId') empresaId: string, @Query('fechaCorte') fechaCorte: string) {
    return this.asientosContablesService.estadoSituacionFinanciera({ empresaId, fechaCorte });
  }
}
