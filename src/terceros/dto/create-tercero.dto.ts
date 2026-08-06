import { TipoTercero, TipoDocumentoIdentidad, TipoContribuyente } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTerceroDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsEnum(TipoTercero)
  tipo: TipoTercero;

  @IsEnum(TipoDocumentoIdentidad)
  tipoDocumento: TipoDocumentoIdentidad;

  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @IsOptional()
  @IsString()
  dvRuc?: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsOptional()
  @IsString()
  nombreFantasia?: string;

  @IsOptional()
  @IsEnum(TipoContribuyente)
  tipoContribuyente?: TipoContribuyente;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  condicionPagoId?: string;

  @IsOptional()
  @IsNumber()
  limiteCredito?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
