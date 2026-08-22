import { AfectacionIVA, CondicionCredito, CondicionVenta, FormaPago, MotivoEmisionNotaCD } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DatosTransporteRemisionDto } from './datos-transporte-remision.dto';
import { DatosVendedorAutofacturaDto } from './datos-vendedor-autofactura.dto';

class ComprobanteItemDto {
  @IsOptional()
  @IsString()
  productoId?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  unidadMedidaId: string;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsEnum(AfectacionIVA)
  afectacionIva: AfectacionIVA;

  @IsOptional()
  @IsIn([0, 5, 10])
  tasaIva?: number;

  @IsOptional()
  @IsNumber()
  proporcionGravada?: number;
}

// Mismos campos que CreateComprobanteDto EXCEPTO empresaId, puntoExpedicionId,
// timbradoId, tipoDocumento, fechaEmision (estos componen el CDC de SIFEN, ya
// calculado y fijo desde el primer intento de envio -- ver
// SifenService.generarYEnviar) y sesionCajaId (la sesion de caja del momento
// de la venta no se toca al corregir). Solo aplica a un comprobante cuyo
// Documento Electronico fue RECHAZADO -- ver ComprobantesService.corregir.
export class CorregirComprobanteDto {
  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @IsEnum(CondicionVenta)
  condicionVenta?: CondicionVenta;

  @IsOptional()
  @IsString()
  condicionPagoId?: string;

  @IsOptional()
  @IsEnum(CondicionCredito)
  condicionCredito?: CondicionCredito;

  @IsOptional()
  @IsString()
  plazoCredito?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  cantidadCuotas?: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsString()
  comprobanteAsociadoId?: string;

  @IsOptional()
  @IsEnum(MotivoEmisionNotaCD)
  motivoEmision?: MotivoEmisionNotaCD;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsString()
  depositoId?: string;

  @IsOptional()
  @IsEnum(FormaPago)
  formaPago?: FormaPago;

  @IsOptional()
  @IsString()
  cuentaBancariaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DatosTransporteRemisionDto)
  datosTransporteRemision?: DatosTransporteRemisionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DatosVendedorAutofacturaDto)
  datosVendedorAutofactura?: DatosVendedorAutofacturaDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComprobanteItemDto)
  items: ComprobanteItemDto[];
}
