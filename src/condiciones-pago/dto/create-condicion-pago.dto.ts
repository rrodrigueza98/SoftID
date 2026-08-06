import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCondicionPagoDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasPlazo?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidadCuotas?: number;
}
