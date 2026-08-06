import { Module } from '@nestjs/common';
import { RecibosService } from './recibos.service';
import { RecibosController } from './recibos.controller';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';

@Module({
  imports: [CuentasCorrientesModule],
  controllers: [RecibosController],
  providers: [RecibosService],
})
export class RecibosModule {}
