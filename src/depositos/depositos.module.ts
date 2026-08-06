import { Module } from '@nestjs/common';
import { DepositosService } from './depositos.service';
import { DepositosController } from './depositos.controller';

@Module({
  controllers: [DepositosController],
  providers: [DepositosService],
})
export class DepositosModule {}
