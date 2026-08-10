import { Module } from '@nestjs/common';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { MovimientosBancariosController } from './movimientos-bancarios.controller';
import { MovimientosBancariosService } from './movimientos-bancarios.service';
import { ConciliacionesBancariasController } from './conciliaciones-bancarias.controller';
import { ConciliacionesBancariasService } from './conciliaciones-bancarias.service';

@Module({
  controllers: [CuentasBancariasController, MovimientosBancariosController, ConciliacionesBancariasController],
  providers: [CuentasBancariasService, MovimientosBancariosService, ConciliacionesBancariasService],
})
export class BancosModule {}
