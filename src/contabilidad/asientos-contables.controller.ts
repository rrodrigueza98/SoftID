import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { AsientosContablesService } from './asientos-contables.service';
import { CreateAsientoContableDto } from './dto/create-asiento-contable.dto';

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
}
