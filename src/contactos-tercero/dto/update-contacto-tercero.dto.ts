import { PartialType } from '@nestjs/mapped-types';
import { CreateContactoTerceroDto } from './create-contacto-tercero.dto';

export class UpdateContactoTerceroDto extends PartialType(CreateContactoTerceroDto) {}
