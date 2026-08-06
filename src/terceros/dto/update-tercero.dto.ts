import { PartialType } from '@nestjs/mapped-types';
import { CreateTerceroDto } from './create-tercero.dto';

export class UpdateTerceroDto extends PartialType(CreateTerceroDto) {}
