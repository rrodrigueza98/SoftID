import { Module } from '@nestjs/common';
import { SifenService } from './sifen.service';
import { CertificadosSifenController } from './certificados-sifen/certificados-sifen.controller';
import { CertificadosSifenService } from './certificados-sifen/certificados-sifen.service';

@Module({
  controllers: [CertificadosSifenController],
  providers: [SifenService, CertificadosSifenService],
  exports: [SifenService],
})
export class SifenModule {}
