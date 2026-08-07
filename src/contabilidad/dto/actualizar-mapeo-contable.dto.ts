import { IsObject } from 'class-validator';
import type { MapeoContable } from '../mapeo-contable';

export class ActualizarMapeoContableDto {
  @IsObject()
  mapeo: MapeoContable;
}
