import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { RequireModulo } from '../auth/decorators/modulo.decorator';
import { RequirePantalla } from '../auth/decorators/pantalla.decorator';

@RequireModulo('INVENTARIO')
@RequirePantalla('STOCK')
@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('stock')
  findSaldo(
    @Query('empresaId') empresaId: string,
    @Query('productoId') productoId?: string,
    @Query('depositoId') depositoId?: string,
  ) {
    return this.stockService.findSaldo({ empresaId, productoId, depositoId });
  }

  @Get('movimientos-stock')
  findMovimientos(
    @Query('productoId') productoId?: string,
    @Query('depositoId') depositoId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockService.findMovimientos({
      productoId,
      depositoId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('movimientos-stock')
  registrarMovimiento(@Body() dto: CreateMovimientoStockDto) {
    return this.stockService.registrarMovimiento(dto);
  }
}
