import { AfectacionIVA } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsOptional()
  @IsString()
  codigoBarra?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsString()
  @IsNotEmpty()
  unidadMedidaId: string;

  @IsOptional()
  @IsEnum(AfectacionIVA)
  afectacionIva?: AfectacionIVA;

  @IsOptional()
  @IsInt()
  @Min(0)
  tasaIva?: number;

  @IsNumber()
  @Min(0)
  precioCosto: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsOptional()
  @IsBoolean()
  controlaStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
