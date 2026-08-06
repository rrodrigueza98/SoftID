import {
  AfectacionIVA,
  CondicionVenta,
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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComprobanteItemDto)
  items: ComprobanteItemDto[];
}
