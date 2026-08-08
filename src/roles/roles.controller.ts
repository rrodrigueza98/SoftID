import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllowForeignEmpresa } from '../auth/decorators/allow-foreign-empresa.decorator';

@Roles('ADMIN')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Se usa, entre otras cosas, para sembrar los roles Administrador/Operador
  // de un tenant recien creado -- el empresaId del body legitimamente no es
  // el del ADMIN que esta ejecutando la accion.
  @AllowForeignEmpresa()
  @Post()
  create(@Body() dto: CreateRolDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId: string) {
    return this.rolesService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRolDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
