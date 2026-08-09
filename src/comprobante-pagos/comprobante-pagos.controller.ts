import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ComprobantePagosService } from './comprobante-pagos.service';
import { CreateComprobantePagoDto } from './dto/create-comprobante-pago.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('VENTAS')
@RequirePantalla('PUNTO_DE_VENTA')
@Controller('comprobante-pagos')
export class ComprobantePagosController {
  constructor(private readonly comprobantePagosService: ComprobantePagosService) {}

  @Post()
  create(@Body() dto: CreateComprobantePagoDto) {
    return this.comprobantePagosService.create(dto);
  }

  @Get()
  findAll(@Query('comprobanteId') comprobanteId: string) {
    return this.comprobantePagosService.findAll(comprobanteId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comprobantePagosService.remove(id);
  }
}
