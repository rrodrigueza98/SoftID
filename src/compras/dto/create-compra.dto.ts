import { AtribucionCreditoF120, CondicionVenta, FormaPago } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCompraDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  proveedorId: string;

  @IsString()
  @IsNotEmpty()
  numeroComprobante: string;

  @IsOptional()
  @IsString()
  timbradoProveedor?: string;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsString()
  @IsNotEmpty()
  cuentaContableId: string;

  @IsOptional()
  @IsEnum(CondicionVenta)
  condicionCompra?: CondicionVenta;

  @IsOptional()
  @IsEnum(FormaPago)
  formaPago?: FormaPago;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoExenta?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoGravada10?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoGravada5?: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  // Formulario 120, Rubro 3: a que se atribuye el credito fiscal de esta
  // compra. Sin valor -> el service usa DIRECTA_GRAVADA (el caso normal).
  @IsOptional()
  @IsEnum(AtribucionCreditoF120)
  atribucionCredito?: AtribucionCreditoF120;
}
