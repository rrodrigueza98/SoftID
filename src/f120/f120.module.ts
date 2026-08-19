import { Module } from '@nestjs/common';
import { F120Service } from './f120.service';
import { F120Controller } from './f120.controller';

@Module({
  controllers: [F120Controller],
  providers: [F120Service],
})
export class F120Module {}
