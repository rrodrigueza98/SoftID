import { Module } from '@nestjs/common';
import { RecibosService } from './recibos.service';
import { RecibosController } from './recibos.controller';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { ContabilidadModule } from '../contabilidad/contabilidad.module';

@Module({
  imports: [CuentasCorrientesModule, ContabilidadModule],
  controllers: [RecibosController],
  providers: [RecibosService],
})
export class RecibosModule {}
