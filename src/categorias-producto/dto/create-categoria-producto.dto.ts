import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoriaProductoDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  categoriaPadreId?: string;
}
