import { TipoMovimientoStock } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateMovimientoStockDto {
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @IsString()
  @IsNotEmpty()
  depositoId: string;

  @IsEnum(TipoMovimientoStock)
  tipo: TipoMovimientoStock;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  // Obligatorio solo para transferencias entre depositos.
  @ValidateIf((o) => o.tipo === TipoMovimientoStock.TRANSFERENCIA_SALIDA)
  @IsString()
  @IsNotEmpty()
  depositoDestinoId?: string;

  @IsOptional()
  @IsNumber()
  costoUnitario?: number;

  @IsOptional()
  @IsString()
  comprobanteId?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
