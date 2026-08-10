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

class AplicacionOrdenPagoDto {
  @IsString()
  @IsNotEmpty()
  compraId: string;

  @IsNumber()
  @IsPositive()
  montoAplicado: number;
}

export class CreateOrdenPagoDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  proveedorId: string;

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

  // Si viene vacio se asume que el pago salio de Caja (efectivo).
  @IsOptional()
  @IsString()
  cuentaBancariaId?: string;

  // Como se reparte el pago entre las compras a credito pendientes del
  // proveedor. Puede quedar vacio (pago a cuenta, sin aplicar a una compra
  // puntual).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AplicacionOrdenPagoDto)
  aplicaciones?: AplicacionOrdenPagoDto[];
}
