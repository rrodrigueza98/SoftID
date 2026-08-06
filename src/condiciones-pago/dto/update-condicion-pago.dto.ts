import { PartialType } from '@nestjs/mapped-types';
import { CreateCondicionPagoDto } from './create-condicion-pago.dto';

export class UpdateCondicionPagoDto extends PartialType(CreateCondicionPagoDto) {}
