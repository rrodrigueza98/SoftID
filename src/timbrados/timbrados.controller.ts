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
import { TimbradosService } from './timbrados.service';
import { CreateTimbradoDto } from './dto/create-timbrado.dto';
import { UpdateTimbradoDto } from './dto/update-timbrado.dto';

@Controller('timbrados')
export class TimbradosController {
  constructor(private readonly timbradosService: TimbradosService) {}

  @Post()
  create(@Body() dto: CreateTimbradoDto) {
    return this.timbradosService.create(dto);
  }

  @Get()
  findAll(@Query('puntoExpedicionId') puntoExpedicionId?: string) {
    return this.timbradosService.findAll(puntoExpedicionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timbradosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimbradoDto) {
    return this.timbradosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timbradosService.remove(id);
  }
}
