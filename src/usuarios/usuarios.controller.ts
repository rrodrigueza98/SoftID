import {
  Body,
  Controller,
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
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.usuariosService.changePassword(id, dto);
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
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Roles('ADMIN')
  @Patch(':id/activar')
  activar(@Param('id') id: string) {
    return this.usuariosService.activar(id);
  }
}
