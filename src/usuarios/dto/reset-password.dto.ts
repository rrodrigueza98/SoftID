import { IsString, MinLength } from 'class-validator';

// A diferencia de ChangePasswordDto, no pide la contraseña actual -- la usa
// un ADMIN/superadmin para restablecerle la clave a otro usuario que la
// olvidó, sin necesidad de conocerla.
export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  passwordNueva: string;
}
