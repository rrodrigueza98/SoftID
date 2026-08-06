import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

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
}
