import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { TipoDeclaracionF120 } from '@prisma/client';

// Los campos opcionales de abajo son las unicas casillas del F.120 que el
// sistema no puede calcular solo a partir de Comprobante/Compra/Retencion
// (ver f120.util.ts): remision voluntaria de saldo a favor al fisco (Art 91
// Ley 6380/2019), credito por exportacion (requiere el Anexo del
// Exportador -- fuera de alcance), deduccion Ley 4962/2013, y la multa por
// mora que el propio Marangatu calcula al presentar fuera de plazo.
export class GenerarF120Dto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'periodoTributario debe tener formato YYYY-MM' })
  periodoTributario: string;

  @IsOptional()
  @IsEnum(TipoDeclaracionF120)
  tipoDeclaracion?: TipoDeclaracionF120;

  @IsOptional()
  @IsInt()
  numeroOrdenRectificada?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoTecnicoRemitidoFisco?: number; // casilla 167

  @IsOptional()
  @IsNumber()
  @Min(0)
  ivaCreditoExportacionUsado?: number; // casilla 49

  @IsOptional()
  @IsNumber()
  @Min(0)
  deduccionDiscapacidad?: number; // casilla 168

  @IsOptional()
  @IsNumber()
  @Min(0)
  multa?: number; // casilla 56

  // Rubro 2 es una ventana movil de los ultimos 6 periodos tributarios --
  // si la empresa recien migro a SoftID, esos meses previos no tienen
  // Comprobantes cargados aca. Mientras tanto, el contador puede pisar
  // estos 3 totales con lo que salia del sistema anterior para ese periodo.
  // Solo importan para el prorrateo del credito indistinto (casilla 164) --
  // ver f120.util.ts::calcularRubro3.
  @IsOptional()
  @IsNumber()
  @Min(0)
  rubro2MercadoInternoOverride?: number; // casilla 160

  @IsOptional()
  @IsNumber()
  @Min(0)
  rubro2AgricolaOverride?: number; // casilla 161

  @IsOptional()
  @IsNumber()
  @Min(0)
  rubro2ExoneradaOverride?: number; // casilla 26
}
