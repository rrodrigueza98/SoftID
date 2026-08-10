import { IsBoolean } from 'class-validator';

export class SetConciliadoDto {
  @IsBoolean()
  conciliado: boolean;
}
