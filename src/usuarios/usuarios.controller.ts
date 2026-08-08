import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllowForeignEmpresa } from '../auth/decorators/allow-foreign-empresa.decorator';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Sin @Roles(): cualquier usuario autenticado necesita poder leer su
  // propio perfil, sin importar su rol.
  @Get('me')
  me(@CurrentUser() usuario: AuthUser) {
    return this.usuariosService.findOne(usuario.id);
  }

  @Roles('ADMIN')
  @Patch(':id/cambiar-password')
  async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.changePassword(id, dto);
  }

  // Reset sin conocer la clave actual -- para cuando un usuario la olvida.
  @Roles('ADMIN')
  @Patch(':id/resetear-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.resetPassword(id, dto);
  }

  // Se usa tambien para crear el primer Administrador de un tenant recien
  // creado -- el empresaId del body legitimamente no es el del ADMIN que
  // esta ejecutando la accion.
  @Roles('ADMIN')
  @AllowForeignEmpresa()
  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.usuariosService.findAll(empresaId);
  }

  @Roles('ADMIN')
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/desactivar')
  async desactivar(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.desactivar(id);
  }

  @Roles('ADMIN')
  @Patch(':id/activar')
  async activar(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    await this.verificarPertenencia(id, usuario);
    return this.usuariosService.activar(id);
  }

  // Un ADMIN solo administra usuarios de su propia empresa -- @Roles limita
  // el nivel de acceso, pero no alcanza para evitar que el ADMIN de un
  // tenant toque los usuarios de otro con solo adivinar/probar un id.
  private async verificarPertenencia(id: string, usuario: AuthUser) {
    if (usuario.esSuperAdmin) return;
    const objetivo = await this.usuariosService.findOne(id);
    if (objetivo.empresaId !== usuario.empresaId) {
      throw new ForbiddenException('No tenés acceso a este usuario');
    }
  }
}
