import { AmbienteSifen } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadCertificadoSifenDto {
  @IsEnum(AmbienteSifen)
  ambiente: AmbienteSifen;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  csc?: string;

  @IsOptional()
  @IsString()
  idCsc?: string;
}
