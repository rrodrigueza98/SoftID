import { TipoCuentaBancaria } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCuentaBancariaDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  banco: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  numeroCuenta: string;

  @IsOptional()
  @IsEnum(TipoCuentaBancaria)
  tipoCuenta?: TipoCuentaBancaria;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsString()
  @IsNotEmpty()
  cuentaContableId: string;

  @IsOptional()
  @IsNumber()
  saldoInicial?: number;

  @IsDateString()
  fechaSaldoInicial: string;
}
