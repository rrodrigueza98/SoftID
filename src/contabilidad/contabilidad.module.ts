import { Module } from '@nestjs/common';
import { AsientosContablesController } from './asientos-contables.controller';
import { AsientosContablesService } from './asientos-contables.service';
import { CuentasContablesController } from './cuentas-contables.controller';
import { CuentasContablesService } from './cuentas-contables.service';

@Module({
  controllers: [CuentasContablesController, AsientosContablesController],
  providers: [CuentasContablesService, AsientosContablesService],
  exports: [AsientosContablesService],
})
export class ContabilidadModule {}
