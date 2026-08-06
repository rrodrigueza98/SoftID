import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreatePuntoExpedicionDto {
  @IsString()
  @IsNotEmpty()
  establecimientoId: string;

  @IsString()
  @Length(3, 3)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
