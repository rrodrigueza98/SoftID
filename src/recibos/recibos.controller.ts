import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RecibosService } from './recibos.service';
import { CreateReciboDto } from './dto/create-recibo.dto';

@Controller('recibos')
export class RecibosController {
  constructor(private readonly recibosService: RecibosService) {}

  @Post()
  create(@Body() dto: CreateReciboDto) {
    return this.recibosService.create(dto);
  }

  @Get()
  findAll(@Query('terceroId') terceroId?: string) {
    return this.recibosService.findAll(terceroId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recibosService.findOne(id);
  }
}
