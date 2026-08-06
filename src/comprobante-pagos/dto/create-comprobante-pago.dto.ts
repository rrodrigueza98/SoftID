import { FormaPago } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateComprobantePagoDto {
  @IsString()
  @IsNotEmpty()
  comprobanteId: string;

  @IsEnum(FormaPago)
  formaPago: FormaPago;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  numeroCheque?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
