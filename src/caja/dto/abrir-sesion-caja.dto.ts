import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AbrirSesionCajaDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  puntoExpedicionId: string;

  @IsNumber()
  @Min(0)
  montoInicial: number;
}
