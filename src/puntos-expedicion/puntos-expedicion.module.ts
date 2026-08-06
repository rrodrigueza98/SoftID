import { Module } from '@nestjs/common';
import { PuntosExpedicionService } from './puntos-expedicion.service';
import { PuntosExpedicionController } from './puntos-expedicion.controller';

@Module({
  controllers: [PuntosExpedicionController],
  providers: [PuntosExpedicionService],
})
export class PuntosExpedicionModule {}
