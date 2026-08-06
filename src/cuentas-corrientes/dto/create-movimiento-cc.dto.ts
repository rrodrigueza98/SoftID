import { TipoMovimientoCuentaCorriente } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

// Movimiento manual (ajustes, notas, etc). Los movimientos que nacen de un
// Comprobante o un Recibo se generan desde esos modulos, no desde aca.
export class CreateMovimientoCCDto {
  @IsString()
  @IsNotEmpty()
  cuentaCorrienteId: string;

  @IsEnum(TipoMovimientoCuentaCorriente)
  tipo: TipoMovimientoCuentaCorriente;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
