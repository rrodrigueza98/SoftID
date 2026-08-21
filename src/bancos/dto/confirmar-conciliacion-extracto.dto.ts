import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ConfirmarConciliacionExtractoDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
