import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

// Un ADMIN solo administra su propia Empresa -- @Roles limita el nivel de
// acceso, pero no alcanza para evitar que el ADMIN de un tenant toque los
// datos de otro, asi que cada ruta con :id verifica ademas la pertenencia.
@Roles('ADMIN')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.empresasService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() usuario: AuthUser) {
    return this.empresasService.findAll(usuario.esSuperAdmin ? undefined : usuario.empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPertenencia(id, usuario);
    return this.empresasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmpresaDto, @CurrentUser() usuario: AuthUser) {
    this.verificarPertenencia(id, usuario);
    return this.empresasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() usuario: AuthUser) {
    this.verificarPertenencia(id, usuario);
    return this.empresasService.remove(id);
  }

  private verificarPertenencia(empresaId: string, usuario: AuthUser) {
    if (!usuario.esSuperAdmin && empresaId !== usuario.empresaId) {
      throw new ForbiddenException('No tenés acceso a esta empresa');
    }
  }
}
