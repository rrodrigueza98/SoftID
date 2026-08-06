import { Module } from '@nestjs/common';
import { ComprobantePagosService } from './comprobante-pagos.service';
import { ComprobantePagosController } from './comprobante-pagos.controller';

@Module({
  controllers: [ComprobantePagosController],
  providers: [ComprobantePagosService],
})
export class ComprobantePagosModule {}
