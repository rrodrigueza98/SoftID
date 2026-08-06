import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUnidadMedidaDto {
  @IsString()
  @IsNotEmpty()
  codigoSifen: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
