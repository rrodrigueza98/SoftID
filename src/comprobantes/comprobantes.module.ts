import { Module } from '@nestjs/common';
import { ComprobantesService } from './comprobantes.service';
import { ComprobantesController } from './comprobantes.controller';
import { StockModule } from '../stock/stock.module';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [StockModule, CuentasCorrientesModule, ContabilidadModule],
  controllers: [ComprobantesController],
  providers: [ComprobantesService],
})
export class ComprobantesModule {}
