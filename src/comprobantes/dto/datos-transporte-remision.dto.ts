import {
  ModalidadTransporte,
  MotivoEmisionNotaRemision,
  NaturalezaTransportista,
  ResponsableEmisionNotaRemision,
  ResponsableFlete,
  TipoDocumentoIdentidad,
  TipoIdentificacionVehiculo,
  TipoTransporte,
} from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class DatosTransporteRemisionDto {
  @IsEnum(MotivoEmisionNotaRemision)
  motivoEmision: MotivoEmisionNotaRemision;

  @IsOptional()
  @IsString()
  motivoEmisionOtro?: string;

  @IsEnum(ResponsableEmisionNotaRemision)
  responsableEmision: ResponsableEmisionNotaRemision;

  @IsOptional()
  @IsInt()
  @IsPositive()
  kmEstimados?: number;

  @IsOptional()
  @IsDateString()
  fechaEmisionFacturaFutura?: string;

  @IsEnum(TipoTransporte)
  tipoTransporte: TipoTransporte;

  @IsEnum(ModalidadTransporte)
  modalidadTransporte: ModalidadTransporte;

  @IsEnum(ResponsableFlete)
  responsableFlete: ResponsableFlete;

  @IsDateString()
  fechaInicioTraslado: string;

  @IsDateString()
  fechaFinTraslado: string;

  @IsString()
  @IsNotEmpty()
  direccionSalida: string;

  @IsString()
  @IsNotEmpty()
  numeroCasaSalida: string;

  @IsString()
  @IsNotEmpty()
  ciudadSalida: string;

  @IsString()
  @IsNotEmpty()
  departamentoSalida: string;

  @IsString()
  @IsNotEmpty()
  direccionEntrega: string;

  @IsString()
  @IsNotEmpty()
  numeroCasaEntrega: string;

  @IsString()
  @IsNotEmpty()
  ciudadEntrega: string;

  @IsString()
  @IsNotEmpty()
  departamentoEntrega: string;

  @IsString()
  @IsNotEmpty()
  tipoVehiculo: string;

  @IsString()
  @IsNotEmpty()
  marcaVehiculo: string;

  @IsEnum(TipoIdentificacionVehiculo)
  tipoIdentificacionVehiculo: TipoIdentificacionVehiculo;

  @IsOptional()
  @IsString()
  numeroIdentificacionVehiculo?: string;

  @IsOptional()
  @IsString()
  numeroMatriculaVehiculo?: string;

  @IsOptional()
  @IsString()
  numeroVuelo?: string;

  @IsEnum(NaturalezaTransportista)
  naturalezaTransportista: NaturalezaTransportista;

  @IsString()
  @IsNotEmpty()
  nombreTransportista: string;

  @IsOptional()
  @IsString()
  rucTransportista?: string;

  @IsOptional()
  @IsString()
  dvRucTransportista?: string;

  @IsOptional()
  @IsEnum(TipoDocumentoIdentidad)
  tipoDocIdentidadTransportista?: TipoDocumentoIdentidad;

  @IsOptional()
  @IsString()
  numeroDocIdentidadTransportista?: string;

  @IsString()
  @IsNotEmpty()
  numeroDocIdentidadChofer: string;

  @IsString()
  @IsNotEmpty()
  nombreChofer: string;
}
