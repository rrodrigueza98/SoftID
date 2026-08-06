import { Module } from '@nestjs/common';
import { ContactosTerceroService } from './contactos-tercero.service';
import { ContactosTerceroController } from './contactos-tercero.controller';

@Module({
  controllers: [ContactosTerceroController],
  providers: [ContactosTerceroService],
})
export class ContactosTerceroModule {}
