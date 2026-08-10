import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCuentaBancariaDto } from './create-cuenta-bancaria.dto';

export class UpdateCuentaBancariaDto extends PartialType(CreateCuentaBancariaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
