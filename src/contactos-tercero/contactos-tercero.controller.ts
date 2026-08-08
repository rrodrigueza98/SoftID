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
import { ContactosTerceroService } from './contactos-tercero.service';
import { CreateContactoTerceroDto } from './dto/create-contacto-tercero.dto';
import { UpdateContactoTerceroDto } from './dto/update-contacto-tercero.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';

@RequireModulo('VENTAS', 'COMPRAS')
@Controller('contactos-tercero')
export class ContactosTerceroController {
  constructor(private readonly contactosTerceroService: ContactosTerceroService) {}

  @Post()
  create(@Body() dto: CreateContactoTerceroDto) {
    return this.contactosTerceroService.create(dto);
  }

  @Get()
  findAll(@Query('terceroId') terceroId: string) {
    return this.contactosTerceroService.findAll(terceroId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactosTerceroService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactoTerceroDto) {
    return this.contactosTerceroService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactosTerceroService.remove(id);
  }
}
