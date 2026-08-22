import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { Pantalla, TipoDocumentoElectronico } from '@prisma/client';
import type { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { CorregirComprobanteDto } from './dto/corregir-comprobante.dto';
import { SifenService } from '../sifen/sifen.service';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@RequireModulo('VENTAS')
@Controller('comprobantes')
export class ComprobantesController {
  constructor(
    private readonly comprobantesService: ComprobantesService,
    private readonly sifenService: SifenService,
  ) {}

  // POS (con sesionCajaId) y Facturacion manual (sin) comparten este mismo
  // endpoint -- no hay forma de restringir por pantalla con un decorador
  // estatico, asi que se verifica a mano segun ese campo.
  @Post()
  create(@Body() dto: CreateComprobanteDto, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, [dto.sesionCajaId ? 'PUNTO_DE_VENTA' : 'FACTURACION']);
    return this.comprobantesService.create(dto);
  }

  @RequirePantalla('COMPROBANTES_EMITIDOS')
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

  // Sin @RequirePantalla propio -- se usa tanto desde el Dashboard (todos los
  // roles con acceso a VENTAS) como desde Cuentas Corrientes, asi que se
  // acepta cualquiera de las dos pantallas en vez de exigir una sola.
  @RequirePantalla('COMPROBANTES_EMITIDOS', 'CUENTAS_CORRIENTES')
  @Get('vencidos')
  vencidos(@Query('empresaId') empresaId: string) {
    return this.comprobantesService.findVencidos(empresaId);
  }

  @RequirePantalla('COMPROBANTES_EMITIDOS')
  @Get('panel-ventas')
  panelVentas(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.comprobantesService.panelVentas(empresaId, desde, hasta);
  }

  @RequirePantalla('COMPROBANTES_EMITIDOS')
  @Get('reporte-rentabilidad')
  reporteRentabilidad(
    @Query('empresaId') empresaId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.comprobantesService.reporteRentabilidad(empresaId, desde, hasta);
  }

  @RequirePantalla('COMPROBANTES_EMITIDOS')
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
    // Deliberadamente sin PUNTO_DE_VENTA aca -- listar el historial completo
    // es justo lo que hace la pantalla Comprobantes emitidos, que un
    // operador acotado solo a Punto de venta no deberia poder ver.
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS']);
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
    // PUNTO_DE_VENTA entra tambien -- el ticket de una venta de POS se
    // imprime pidiendo este mismo endpoint justo despues de emitir.
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS', 'PUNTO_DE_VENTA']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return comprobante;
  }

  @Patch(':id/anular')
  async anular(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return this.comprobantesService.anular(id);
  }

  // Corrige un comprobante cuyo Documento Electronico fue RECHAZADO por
  // SIFEN -- ver ComprobantesService.corregir para el alcance exacto (todo
  // lo que no compone el CDC). Despues de corregir, el usuario reintenta el
  // envio con reintentar-sifen (no se encadena automaticamente aca).
  @Patch(':id/corregir')
  async corregir(@Param('id') id: string, @Body() dto: CorregirComprobanteDto, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return this.comprobantesService.corregir(id, dto);
  }

  // Reintento manual del envío a SIFEN -- a diferencia del intento
  // automático en create() (que se traga el error para no bloquear la
  // venta), esta es una acción explícita del usuario y sí deja que el error
  // llegue como respuesta HTTP.
  @Patch(':id/reintentar-sifen')
  async reintentarSifen(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return this.sifenService.generarYEnviar(id);
  }

  @Get(':id/documento-electronico')
  async documentoElectronico(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS', 'PUNTO_DE_VENTA']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    return comprobante.documentoElectronico;
  }

  // Descarga el XML firmado tal cual se envio/aprobo en SIFEN (xmlFirmado)
  // -- no el que se genera antes de firmar, para que lo que se descargue
  // sea exactamente lo que quedo registrado ante SIFEN.
  @Get(':id/xml')
  async descargarXml(@Param('id') id: string, @CurrentUser() usuario: AuthUser, @Res({ passthrough: true }) res: Response) {
    this.verificarPantalla(usuario, ['COMPROBANTES_EMITIDOS', 'PUNTO_DE_VENTA']);
    const comprobante = await this.comprobantesService.findOne(id);
    this.verificarAccesoPuntoExpedicion(comprobante.puntoExpedicionId, usuario);
    const de = comprobante.documentoElectronico;
    if (!de?.xmlFirmado) {
      throw new NotFoundException('Este comprobante todavía no tiene un XML firmado generado');
    }
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${de.cdc ?? id}.xml"`,
    });
    return new StreamableFile(Buffer.from(de.xmlFirmado, 'utf8'));
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

  // Chequeo manual (no via decorador) para las rutas donde la pantalla
  // requerida depende de datos de la request (POS vs Facturacion) o donde
  // se aceptan varias pantallas alternativas.
  private verificarPantalla(usuario: AuthUser, permitidas: Pantalla[]) {
    if (usuario.esSuperAdmin || usuario.rolTipo === 'ADMIN' || usuario.pantallasPermitidas.length === 0) {
      return;
    }
    if (!permitidas.some((p) => usuario.pantallasPermitidas.includes(p))) {
      throw new ForbiddenException('Tu usuario no tiene acceso a esta pantalla');
    }
  }
}
