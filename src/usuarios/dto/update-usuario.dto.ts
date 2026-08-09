import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Modulo } from '@prisma/client';

// Deliberadamente sin `password` -- el cambio de contraseña tiene su propio
// endpoint (ChangePasswordDto) para no mezclar validaciones.
export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  rolId?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(Modulo, { each: true })
  modulosPermitidos?: Modulo[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  puntosExpedicionPermitidos?: string[];
}
