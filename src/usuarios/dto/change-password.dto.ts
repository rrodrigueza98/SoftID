import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  passwordActual: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  passwordNueva: string;
}
