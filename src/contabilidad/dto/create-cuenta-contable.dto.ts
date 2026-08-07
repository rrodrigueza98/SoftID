import { NaturalezaCuenta, TipoCuentaContable } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCuentaContableDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(TipoCuentaContable)
  tipo: TipoCuentaContable;

  @IsEnum(NaturalezaCuenta)
  naturaleza: NaturalezaCuenta;

  @IsOptional()
  @IsBoolean()
  imputable?: boolean;

  @IsOptional()
  @IsString()
  cuentaPadreId?: string;
}
