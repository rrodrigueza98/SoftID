import { TipoMovimientoBancario } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateMovimientoBancarioDto {
  @IsString()
  @IsNotEmpty()
  cuentaBancariaId: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsEnum(TipoMovimientoBancario)
  tipo: TipoMovimientoBancario;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  referencia?: string;
}
