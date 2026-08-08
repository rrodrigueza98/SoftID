import {
  AfectacionIVA,
  CondicionCredito,
  CondicionVenta,
  FormaPago,
  MotivoEmisionNotaCD,
  TipoDocumentoElectronico,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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

  // Solo si afectacionIva = GRAVADO_PARCIAL: % del item sujeto a IVA (0-100).
  @IsOptional()
  @IsNumber()
  proporcionGravada?: number;
}

export class CreateComprobanteDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  puntoExpedicionId: string;

  @IsString()
  @IsNotEmpty()
  timbradoId: string;

  @IsEnum(TipoDocumentoElectronico)
  tipoDocumento: TipoDocumentoElectronico;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

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

  // Obligatorios (E641/E643/E644) si condicionVenta = CREDITO: si es a Plazo
  // se informa plazoCredito, si es a Cuota se informa cantidadCuotas.
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

  // Obligatorio si tipoDocumento es NOTA_CREDITO_ELECTRONICA o NOTA_DEBITO_ELECTRONICA.
  @IsOptional()
  @IsEnum(MotivoEmisionNotaCD)
  motivoEmision?: MotivoEmisionNotaCD;

  @IsOptional()
  @IsString()
  observacion?: string;

  // Si se informa, una FACTURA_ELECTRONICA genera automaticamente la salida
  // de stock de sus items con productoId (ver comentario en el service).
  @IsOptional()
  @IsString()
  depositoId?: string;

  // Si la venta se hace desde el Punto de Venta (POS), se informa la sesion
  // de caja abierta para que quede asociada y sume al arqueo del turno.
  @IsOptional()
  @IsString()
  sesionCajaId?: string;

  // Obligatorio (E606) cuando condicionVenta = CONTADO: ademas de decidir
  // Caja vs Banco en el asiento contable automatico, genera un
  // ComprobantePago por el total al momento de emitir (ver
  // ComprobantesService.create). No se persiste en el Comprobante en si.
  @IsOptional()
  @IsEnum(FormaPago)
  formaPago?: FormaPago;

  // Obligatorio si tipoDocumento es NOTA_REMISION_ELECTRONICA (grupos E6/E10
  // del Manual Tecnico SIFEN v150).
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosTransporteRemisionDto)
  datosTransporteRemision?: DatosTransporteRemisionDto;

  // Obligatorio si tipoDocumento es AUTOFACTURA_ELECTRONICA (grupo E4 del
  // Manual Tecnico SIFEN v150: datos del vendedor y lugar de la transaccion).
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
