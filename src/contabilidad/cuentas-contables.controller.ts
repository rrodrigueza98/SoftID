import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CuentasContablesService } from './cuentas-contables.service';
import { ActualizarMapeoContableDto } from './dto/actualizar-mapeo-contable.dto';
import { ActualizarCierreContableDto } from './dto/actualizar-cierre-contable.dto';
import { CreateCuentaContableDto } from './dto/create-cuenta-contable.dto';
import { ROL_LABEL } from './mapeo-contable';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('CONTABILIDAD')
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

  @Get('cierre')
  obtenerCierre(@Query('empresaId') empresaId: string) {
    return this.cuentasContablesService.obtenerCierre(empresaId);
  }

  // Solo ADMIN/superadmin -- cerrar un periodo bloquea a todos los usuarios
  // (incluidos otros ADMIN) de cargar movimientos con esa fecha o anterior,
  // asi que es una decision de alcance de empresa, no una tarea operativa.
  @Roles('ADMIN')
  @Put('cierre')
  actualizarCierre(@Query('empresaId') empresaId: string, @Body() dto: ActualizarCierreContableDto) {
    return this.cuentasContablesService.actualizarCierre(empresaId, dto.fechaCierreContable ?? null);
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
