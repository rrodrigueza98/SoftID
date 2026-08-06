import { Module } from '@nestjs/common';
import { ComprobantesService } from './comprobantes.service';
import { ComprobantesController } from './comprobantes.controller';
import { StockModule } from '../stock/stock.module';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';

@Module({
  imports: [StockModule, CuentasCorrientesModule],
  controllers: [ComprobantesController],
  providers: [ComprobantesService],
})
export class ComprobantesModule {}
