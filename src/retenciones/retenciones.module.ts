import { Module } from '@nestjs/common';
import { RetencionesService } from './retenciones.service';
import { RetencionesController } from './retenciones.controller';

@Module({
  controllers: [RetencionesController],
  providers: [RetencionesService],
})
export class RetencionesModule {}
