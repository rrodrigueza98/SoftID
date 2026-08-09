import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Modulo, Pantalla } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  rolId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Solo tiene efecto para usuarios OPERADOR (ver ModulosGuard). Vacio u
  // omitido = sin restriccion, accede a todos los modulos operativos.
  @IsOptional()
  @IsArray()
  @IsEnum(Modulo, { each: true })
  modulosPermitidos?: Modulo[];

  // Solo tiene efecto para usuarios OPERADOR (ver PuntosExpedicionGuard).
  // Vacio u omitido = sin restriccion, opera en cualquier punto de expedicion.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  puntosExpedicionPermitidos?: string[];

  // Solo tiene efecto para usuarios OPERADOR (ver PantallasGuard). Vacio u
  // omitido = sin restriccion adicional dentro de los modulos permitidos.
  @IsOptional()
  @IsArray()
  @IsEnum(Pantalla, { each: true })
  pantallasPermitidas?: Pantalla[];
}
