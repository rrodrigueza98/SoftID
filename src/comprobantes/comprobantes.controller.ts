import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { TipoDocumentoElectronico } from '@prisma/client';
import type { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@RequireModulo('VENTAS')
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

  @Get('panel-ventas')
  panelVentas(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.comprobantesService.panelVentas(empresaId, desde, hasta);
  }

  @Get('reporte-rentabilidad')
  reporteRentabilidad(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.comprobantesService.reporteRentabilidad(empresaId, desde, hasta);
  }

  @Get('reporte-rentabilidad.xlsx')
  async reporteRentabilidadExcel(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.comprobantesService.generarReporteRentabilidadExcel(empresaId, desde, hasta);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rentabilidad-${desde}-a-${hasta}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @CurrentUser() usuario: AuthUser,
    @Query('clienteId') clienteId?: string,
    @Query('proveedorId') proveedorId?: string,
    @Query('tipoDocumento') tipoDocumento?: TipoDocumentoElectronico,
  ) {
    return this.comprobantesService.findAll({
      empresaId,
      clienteId,
      proveedorId,
      tipoDocumento,
      puntosExpedicionPermitidos: this.puntosPermitidos(usuario),
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return comprobante;
  }

  @Patch(':id/anular')
  async anular(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return this.comprobantesService.anular(id);
  }

  // undefined para ADMIN/superadmin/sin restriccion -- asi el service sabe
  // que no debe filtrar nada (ver ComprobantesService.findAll).
  private puntosPermitidos(usuario: AuthUser): string[] | undefined {
    if (usuario.esSuperAdmin || usuario.rolTipo === 'ADMIN' || usuario.puntosExpedicionPermitidos.length === 0) {
      return undefined;
    }
    return usuario.puntosExpedicionPermitidos;
  }

  private verificarAccesoPuntoExpedicion(puntoExpedicionId: string, usuario: AuthUser) {
    if (usuario.esSuperAdmin || usuario.rolTipo === 'ADMIN' || usuario.puntosExpedicionPermitidos.length === 0) {
      return;
    }
    if (!usuario.puntosExpedicionPermitidos.includes(puntoExpedicionId)) {
      throw new ForbiddenException('No tenés acceso a este comprobante');
    }
  }
}
