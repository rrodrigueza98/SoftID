import { IsDateString, IsOptional } from 'class-validator';

export class ActualizarCierreContableDto {
  // Vacio/null = quitar el cierre (volver a dejar todas las fechas abiertas).
  @IsOptional()
  @IsDateString()
  fechaCierreContable?: string;
}
