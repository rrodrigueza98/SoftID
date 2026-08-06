import { Module } from '@nestjs/common';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CuentasCorrientesController } from './cuentas-corrientes.controller';

@Module({
  controllers: [CuentasCorrientesController],
  providers: [CuentasCorrientesService],
  exports: [CuentasCorrientesService],
})
export class CuentasCorrientesModule {}
