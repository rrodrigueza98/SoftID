import { PartialType } from '@nestjs/mapped-types';
import { CreatePuntoExpedicionDto } from './create-punto-expedicion.dto';

export class UpdatePuntoExpedicionDto extends PartialType(CreatePuntoExpedicionDto) {}
