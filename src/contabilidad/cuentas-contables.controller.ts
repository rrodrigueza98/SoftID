import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CuentasContablesService } from './cuentas-contables.service';
import { ActualizarMapeoContableDto } from './dto/actualizar-mapeo-contable.dto';
import { CreateCuentaContableDto } from './dto/create-cuenta-contable.dto';
import { ROL_LABEL } from './mapeo-contable';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

@RequireModulo('CONTABILIDAD')
@Controller('cuentas-contables')
export class CuentasContablesController {
  constructor(private readonly cuentasContablesService: CuentasContablesService) {}

  @Get('roles')
  roles() {
    return ROL_LABEL;
  }

  @Get('mapeo')
  obtenerMapeo(@Query('empresaId') empresaId: string) {
    return this.cuentasContablesService.obtenerMapeo(empresaId);
  }

  @Put('mapeo')
  actualizarMapeo(@Query('empresaId') empresaId: string, @Body() dto: ActualizarMapeoContableDto) {
    return this.cuentasContablesService.actualizarMapeo(empresaId, dto.mapeo);
  }

  @Post('sembrar-plan-estandar')
  sembrarPlanEstandar(@Query('empresaId') empresaId: string) {
    return this.cuentasContablesService.sembrarPlanEstandar(empresaId);
  }

  @Post()
  create(@Body() dto: CreateCuentaContableDto) {
    return this.cuentasContablesService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.cuentasContablesService.findAll(empresaId);
  }
}
