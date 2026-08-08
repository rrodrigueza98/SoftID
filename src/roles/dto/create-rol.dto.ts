import { RolTipo } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  // Sin especificar, el modelo lo deja en OPERADOR (ver default en schema.prisma).
  @IsOptional()
  @IsEnum(RolTipo)
  tipo?: RolTipo;

  // Lista libre de permisos (ej. "productos:crear", "comprobantes:anular").
  // Sin catalogo cerrado todavia -- se define cuando exista una UI que los
  // consuma para autorizar acciones puntuales.
  @IsOptional()
  @IsArray()
  permisos?: string[];
}
