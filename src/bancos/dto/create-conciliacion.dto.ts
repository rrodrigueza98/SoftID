import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateConciliacionDto {
  @IsString()
  @IsNotEmpty()
  cuentaBancariaId: string;

  @IsDateString()
  fechaCorte: string;

  @IsNumber()
  saldoExtracto: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
