import { Module } from '@nestjs/common';
import { TercerosService } from './terceros.service';
import { TercerosController } from './terceros.controller';

@Module({
  controllers: [TercerosController],
  providers: [TercerosService],
})
export class TercerosModule {}
