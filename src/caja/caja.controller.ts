import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirSesionCajaDto } from './dto/abrir-sesion-caja.dto';
import { CerrarSesionCajaDto } from './dto/cerrar-sesion-caja.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

@RequireModulo('VENTAS')
@Controller('caja/sesiones')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post()
  abrir(@Body() dto: AbrirSesionCajaDto, @CurrentUser() usuario: AuthUser) {
    return this.cajaService.abrirSesion(dto, usuario.id);
  }

  @Get('actual')
  actual(@Query('puntoExpedicionId') puntoExpedicionId: string) {
    return this.cajaService.obtenerActual(puntoExpedicionId);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string, @Query('puntoExpedicionId') puntoExpedicionId?: string) {
    return this.cajaService.findAll({ empresaId, puntoExpedicionId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cajaService.findOne(id);
  }

  @Post(':id/cerrar')
  cerrar(@Param('id') id: string, @Body() dto: CerrarSesionCajaDto, @CurrentUser() usuario: AuthUser) {
    return this.cajaService.cerrarSesion(id, dto, usuario.id);
  }
}
