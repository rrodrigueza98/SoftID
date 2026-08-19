import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { F120Service } from './f120.service';
import { GenerarF120Dto } from './dto/generar-f120.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('FORMULARIO_120')
@Controller('f120')
export class F120Controller {
  constructor(private readonly f120Service: F120Service) {}

  @Post('generar')
  generar(@Body() dto: GenerarF120Dto, @CurrentUser() usuario: AuthUser) {
    return this.f120Service.generar(dto.empresaId, usuario.id, dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.f120Service.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.f120Service.findOne(id);
  }

  @Patch(':id/anular')
  anular(@Param('id') id: string) {
    return this.f120Service.anular(id);
  }
}
