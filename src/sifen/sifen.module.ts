import { Module } from '@nestjs/common';
import { SifenService } from './sifen.service';
import { CertificadosSifenController } from './certificados-sifen/certificados-sifen.controller';
import { CertificadosSifenService } from './certificados-sifen/certificados-sifen.service';
import { CiudadesSifenService } from './geografia/ciudades-sifen.service';

@Module({
  controllers: [CertificadosSifenController],
  providers: [SifenService, CertificadosSifenService, CiudadesSifenService],
  exports: [SifenService],
})
export class SifenModule {}
