import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContactoTerceroDto {
  @IsString()
  @IsNotEmpty()
  terceroId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
