import { Module } from '@nestjs/common';
import { TimbradosService } from './timbrados.service';
import { TimbradosController } from './timbrados.controller';

@Module({
  controllers: [TimbradosController],
  providers: [TimbradosService],
})
export class TimbradosModule {}
