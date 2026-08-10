import { Module } from '@nestjs/common';
import { OrdenesPagoService } from './ordenes-pago.service';
import { OrdenesPagoController } from './ordenes-pago.controller';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [CuentasCorrientesModule, ContabilidadModule],
  controllers: [OrdenesPagoController],
  providers: [OrdenesPagoService],
})
export class OrdenesPagoModule {}
