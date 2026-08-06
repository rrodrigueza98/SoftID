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
import { CondicionesPagoService } from './condiciones-pago.service';
import { CreateCondicionPagoDto } from './dto/create-condicion-pago.dto';
import { UpdateCondicionPagoDto } from './dto/update-condicion-pago.dto';

@Controller('condiciones-pago')
export class CondicionesPagoController {
  constructor(private readonly condicionesPagoService: CondicionesPagoService) {}

  @Post()
  create(@Body() dto: CreateCondicionPagoDto) {
    return this.condicionesPagoService.create(dto);
  }

  @Get()
  findAll(@Query('empresaId') empresaId?: string) {
    return this.condicionesPagoService.findAll(empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.condicionesPagoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCondicionPagoDto) {
    return this.condicionesPagoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.condicionesPagoService.remove(id);
  }
}
