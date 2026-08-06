import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { TipoDocumentoElectronico } from '@prisma/client';
import type { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';

@Controller('comprobantes')
export class ComprobantesController {
  constructor(private readonly comprobantesService: ComprobantesService) {}

  @Post()
  create(@Body() dto: CreateComprobanteDto) {
    return this.comprobantesService.create(dto);
  }

  @Get('reporte-ventas')
  async reporteVentas(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.comprobantesService.generarLibroVentas(empresaId, desde, hasta);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="libro-ventas-${desde}-a-${hasta}.xlsx"`,
    });
    return new StreamableFile(buffer);
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
