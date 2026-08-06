import { PartialType } from '@nestjs/mapped-types';
import { CreateTimbradoDto } from './create-timbrado.dto';

export class UpdateTimbradoDto extends PartialType(CreateTimbradoDto) {}
