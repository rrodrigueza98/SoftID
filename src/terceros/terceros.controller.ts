import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Pantalla, TipoTercero } from '@prisma/client';
import { TercerosService } from './terceros.service';
import { CreateTerceroDto } from './dto/create-tercero.dto';
import { UpdateTerceroDto } from './dto/update-tercero.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

// Clientes y proveedores comparten esta tabla/controller (campo `tipo`) --
// alcanza con acceso a Ventas O Compras para entrar.
@RequireModulo('VENTAS', 'COMPRAS')
@Controller('terceros')
export class TercerosController {
  constructor(private readonly tercerosService: TercerosService) {}

  @Post()
  create(@Body() dto: CreateTerceroDto, @CurrentUser() usuario: AuthUser) {
    // Un operador de Punto de Venta puede dar de alta un cliente al vuelo
    // (consumidor final que pide factura, o via el buscador de DNIT) aunque
    // no tenga la pantalla Clientes -- mismo criterio que abrir la lectura
    // de Productos/Stock para Facturacion/POS.
    const permitidas = dto.tipo === 'CLIENTE' ? ['CLIENTES', 'PUNTO_DE_VENTA'] : this.pantallasParaTipo(dto.tipo);
    this.verificarPantalla(usuario, permitidas as Pantalla[]);
    return this.tercerosService.create(dto);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @CurrentUser() usuario: AuthUser,
    @Query('tipo') tipo?: TipoTercero,
    @Query('search') search?: string,
  ) {
    const permitidas = tipo === 'CLIENTE' ? ['CLIENTES', 'PUNTO_DE_VENTA'] : this.pantallasParaTipo(tipo);
    this.verificarPantalla(usuario, permitidas as Pantalla[]);
    return this.tercerosService.findAll({ empresaId, tipo, search });
  }

  // Sin tipo asociado a mano -- se usa desde el alta de Clientes, de
  // Proveedores, y desde Punto de Venta (buscar/crear cliente al vuelo).
  @Get('buscar-ruc')
  buscarEnDnit(@Query('q') q: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['CLIENTES', 'PROVEEDORES', 'PUNTO_DE_VENTA']);
    return this.tercerosService.buscarEnDnit(q);
  }

  @Get('plantilla-excel')
  async plantillaExcel(
    @Query('empresaId') empresaId: string,
    @Query('tipo') tipo: TipoTercero,
    @CurrentUser() usuario: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.verificarPantalla(usuario, this.pantallasParaTipo(tipo));
    const buffer = await this.tercerosService.generarPlantillaExcel(empresaId, this.tipoImportable(tipo));
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-${tipo === 'CLIENTE' ? 'clientes' : 'proveedores'}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('importar-excel')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  importarExcel(
    @Query('empresaId') empresaId: string,
    @Query('tipo') tipo: TipoTercero,
    @CurrentUser() usuario: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.verificarPantalla(usuario, this.pantallasParaTipo(tipo));
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');
    return this.tercerosService.importarExcel(empresaId, this.tipoImportable(tipo), file.buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['CLIENTES', 'PROVEEDORES']);
    return this.tercerosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTerceroDto, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, dto.tipo ? this.pantallasParaTipo(dto.tipo) : ['CLIENTES', 'PROVEEDORES']);
    return this.tercerosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['CLIENTES', 'PROVEEDORES']);
    return this.tercerosService.remove(id);
  }

  // La importacion masiva siempre se hace desde la pantalla de Clientes o de
  // Proveedores (nunca "AMBOS", que es un caso raro de alta manual) -- asi
  // la plantilla y el parser saben en que hoja/tabla buscar.
  private tipoImportable(tipo: TipoTercero): 'CLIENTE' | 'PROVEEDOR' {
    if (tipo !== 'CLIENTE' && tipo !== 'PROVEEDOR') {
      throw new BadRequestException('Elegí Clientes o Proveedores para importar.');
    }
    return tipo;
  }

  private pantallasParaTipo(tipo?: TipoTercero): Pantalla[] {
    if (tipo === 'CLIENTE') return ['CLIENTES'];
    if (tipo === 'PROVEEDOR') return ['PROVEEDORES'];
    return ['CLIENTES', 'PROVEEDORES']; // AMBOS o sin filtro
  }

  private verificarPantalla(usuario: AuthUser, permitidas: Pantalla[]) {
    if (usuario.esSuperAdmin || usuario.rolTipo === 'ADMIN' || usuario.pantallasPermitidas.length === 0) {
      return;
    }
    if (!permitidas.some((p) => usuario.pantallasPermitidas.includes(p))) {
      throw new ForbiddenException('Tu usuario no tiene acceso a esta pantalla');
    }
  }
}
