import { NaturalezaVendedorAutofactura, TipoDocumentoIdentidad } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class DatosVendedorAutofacturaDto {
  @IsEnum(NaturalezaVendedorAutofactura)
  naturalezaVendedor: NaturalezaVendedorAutofactura;

  @IsEnum(TipoDocumentoIdentidad)
  tipoDocIdentidadVendedor: TipoDocumentoIdentidad;

  @IsString()
  @IsNotEmpty()
  numeroDocIdentidadVendedor: string;

  @IsString()
  @IsNotEmpty()
  nombreVendedor: string;

  @IsString()
  @IsNotEmpty()
  direccionVendedor: string;

  @IsString()
  @IsNotEmpty()
  numeroCasaVendedor: string;

  @IsString()
  @IsNotEmpty()
  ciudadVendedor: string;

  @IsString()
  @IsNotEmpty()
  departamentoVendedor: string;

  @IsString()
  @IsNotEmpty()
  direccionTransaccion: string;

  @IsString()
  @IsNotEmpty()
  ciudadTransaccion: string;

  @IsString()
  @IsNotEmpty()
  departamentoTransaccion: string;
}
