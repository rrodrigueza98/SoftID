import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConciliacionesBancariasService } from './conciliaciones-bancarias.service';
import { CreateConciliacionDto } from './dto/create-conciliacion.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('CONTABILIDAD')
@RequirePantalla('BANCOS')
@Controller('conciliaciones-bancarias')
export class ConciliacionesBancariasController {
  constructor(private readonly conciliacionesBancariasService: ConciliacionesBancariasService) {}

  @Post()
  create(@Body() dto: CreateConciliacionDto) {
    return this.conciliacionesBancariasService.create(dto);
  }

  @Get()
  findAll(@Query('cuentaBancariaId') cuentaBancariaId: string) {
    return this.conciliacionesBancariasService.findAll(cuentaBancariaId);
  }
}
