import { TipoRetencionIva } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CreateRetencionIvaDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsEnum(TipoRetencionIva)
  tipo: TipoRetencionIva;

  @IsDateString()
  fecha: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodoTributario debe tener formato YYYY-MM' })
  periodoTributario: string;

  @IsString()
  @IsNotEmpty()
  agenteRetentorRuc: string;

  @IsString()
  @IsNotEmpty()
  agenteRetentorNombre: string;

  @IsOptional()
  @IsString()
  numeroComprobanteRetencion?: string;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  comprobanteId?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
