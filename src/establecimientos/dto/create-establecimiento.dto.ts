import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateEstablecimientoDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @Length(3, 3)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

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
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  esCasaMatriz?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
