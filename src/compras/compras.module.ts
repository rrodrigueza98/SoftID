import { Module } from '@nestjs/common';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [CuentasCorrientesModule, ContabilidadModule],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
