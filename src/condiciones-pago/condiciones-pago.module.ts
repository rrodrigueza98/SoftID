import { Module } from '@nestjs/common';
import { CondicionesPagoService } from './condiciones-pago.service';
import { CondicionesPagoController } from './condiciones-pago.controller';

@Module({
  controllers: [CondicionesPagoController],
  providers: [CondicionesPagoService],
})
export class CondicionesPagoModule {}
