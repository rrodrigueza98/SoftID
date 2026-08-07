import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class AsientoDetalleDto {
  @IsString()
  @IsNotEmpty()
  cuentaId: string;

  @IsNumber()
  @Min(0)
  debe: number;

  @IsNumber()
  @Min(0)
  haber: number;

  @IsOptional()
  @IsString()
  glosa?: string;
}

export class CreateAsientoContableDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => AsientoDetalleDto)
  detalles: AsientoDetalleDto[];
}
