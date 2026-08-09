import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
    this.verificarPantalla(usuario, this.pantallasParaTipo(dto.tipo));
    return this.tercerosService.create(dto);
  }

  @Get()
  findAll(
    @Query('empresaId') empresaId: string,
    @CurrentUser() usuario: AuthUser,
    @Query('tipo') tipo?: TipoTercero,
    @Query('search') search?: string,
  ) {
    this.verificarPantalla(usuario, this.pantallasParaTipo(tipo));
    return this.tercerosService.findAll({ empresaId, tipo, search });
  }

  // Sin tipo asociado a mano -- se usa tanto desde el alta de Clientes como
  // de Proveedores, alcanza con acceso a cualquiera de las dos pantallas.
  @Get('buscar-ruc')
  buscarEnDnit(@Query('q') q: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPantalla(usuario, ['CLIENTES', 'PROVEEDORES']);
    return this.tercerosService.buscarEnDnit(q);
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
