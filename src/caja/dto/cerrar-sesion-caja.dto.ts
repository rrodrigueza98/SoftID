import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CerrarSesionCajaDto {
  @IsNumber()
  @Min(0)
  montoFinalDeclarado: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
