import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TipoDocumentoElectronico } from '@prisma/client';
import { ComprobantesService } from './comprobantes.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';

@Controller('comprobantes')
export class ComprobantesController {
  constructor(private readonly comprobantesService: ComprobantesService) {}

  @Post()
  create(@Body() dto: CreateComprobanteDto) {
    return this.comprobantesService.create(dto);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @Query('clienteId') clienteId?: string,
    @Query('proveedorId') proveedorId?: string,
    @Query('tipoDocumento') tipoDocumento?: TipoDocumentoElectronico,
  ) {
    return this.comprobantesService.findAll({ empresaId, clienteId, proveedorId, tipoDocumento });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comprobantesService.findOne(id);
  }

  @Patch(':id/anular')
  anular(@Param('id') id: string) {
    return this.comprobantesService.anular(id);
  }
}
