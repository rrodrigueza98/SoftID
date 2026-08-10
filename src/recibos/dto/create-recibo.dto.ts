import { FormaPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class AplicacionReciboDto {
  @IsString()
  @IsNotEmpty()
  comprobanteId: string;

  @IsNumber()
  @IsPositive()
  montoAplicado: number;
}

export class CreateReciboDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  terceroId: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsEnum(FormaPago)
  formaPago: FormaPago;

  @IsOptional()
  @IsString()
  observacion?: string;

  // Solo aplica cuando el cobro entra por una cuenta bancaria real
  // (transferencia, deposito, etc.) -- si se manda, se genera un movimiento
  // en Bancos enlazado a este recibo, listo para conciliar.
  @IsOptional()
  @IsString()
  cuentaBancariaId?: string;

  // Como se reparte el cobro entre las facturas pendientes del tercero.
  // Puede quedar vacio (cobro a cuenta, sin aplicar a un comprobante puntual).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AplicacionReciboDto)
  aplicaciones?: AplicacionReciboDto[];
}
