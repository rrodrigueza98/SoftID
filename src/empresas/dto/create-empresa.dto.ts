import { TipoContribuyente, RegimenTributario, RegimenEspecialSifen } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @Length(3, 8)
  ruc: string;

  @IsString()
  @Length(1, 1)
  dvRuc: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsOptional()
  @IsString()
  nombreFantasia?: string;

  @IsEnum(TipoContribuyente)
  tipoContribuyente: TipoContribuyente;

  @IsOptional()
  @IsEnum(RegimenTributario)
  regimenTributario?: RegimenTributario;

  @IsOptional()
  @IsEnum(RegimenEspecialSifen)
  regimenEspecialSifen?: RegimenEspecialSifen;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  departamento: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Clasificador de Actividades Economicas de SET (gActEco de SIFEN) --
  // obligatorio en la practica para emitir Documentos Electronicos, aunque
  // el XSD lo marca opcional (ver src/sifen/xml/groups/g-emis.builder.ts).
  @IsOptional()
  @IsString()
  actividadEconomicaCodigo?: string;

  @IsOptional()
  @IsString()
  actividadEconomicaDescripcion?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
