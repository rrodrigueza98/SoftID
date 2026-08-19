import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RetencionesService } from './retenciones.service';
import { CreateRetencionIvaDto } from './dto/create-retencion-iva.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('FORMULARIO_120')
@Controller('retenciones-iva')
export class RetencionesController {
  constructor(private readonly retencionesService: RetencionesService) {}

  @Post()
  create(@Body() dto: CreateRetencionIvaDto) {
    return this.retencionesService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string, @Query('periodoTributario') periodoTributario?: string) {
    return this.retencionesService.findAll({ empresaId, periodoTributario });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.retencionesService.remove(id);
  }
}
