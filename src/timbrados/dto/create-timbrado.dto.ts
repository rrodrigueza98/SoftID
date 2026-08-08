import { TipoDocumentoElectronico } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateTimbradoDto {
  @IsString()
  @IsNotEmpty()
  puntoExpedicionId: string;

  @IsString()
  @Length(8, 8)
  numeroTimbrado: string;

  @IsEnum(TipoDocumentoElectronico)
  tipoDocumento: TipoDocumentoElectronico;

  // false = timbrado tradicional (preimpreso/virtual, sin DTE): sin las
  // exigencias de SIFEN. Por defecto true para no romper timbrados
  // existentes, todos electronicos hasta ahora.
  @IsOptional()
  @IsBoolean()
  esElectronico?: boolean;

  @IsInt()
  @Min(1)
  numeroDesde: number;

  @IsInt()
  @Min(1)
  numeroHasta: number;

  @IsDateString()
  fechaInicioVigencia: string;

  @IsOptional()
  @IsDateString()
  fechaFinVigencia?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
