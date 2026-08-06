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
