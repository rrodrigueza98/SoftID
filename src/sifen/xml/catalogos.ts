import { TipoContribuyente, TipoDocumentoElectronico, TipoEmisionDE } from '@prisma/client';

// Catalogos cerrados del Manual Tecnico SIFEN v150 -- cada campo codificado
// "iXxx" va acompanado de un campo de texto "dDesXxx" con la descripcion
// oficial de ese codigo. Centralizados aca para no repetir el texto en cada
// builder de grupo.

export const ITIDE_POR_TIPO: Partial<Record<TipoDocumentoElectronico, string>> = {
  FACTURA_ELECTRONICA: '1',
  AUTOFACTURA_ELECTRONICA: '4',
  NOTA_CREDITO_ELECTRONICA: '5',
  NOTA_DEBITO_ELECTRONICA: '6',
  NOTA_REMISION_ELECTRONICA: '7',
};

export const DESC_TIDE_POR_TIPO: Partial<Record<TipoDocumentoElectronico, string>> = {
  FACTURA_ELECTRONICA: 'Factura electrónica',
  AUTOFACTURA_ELECTRONICA: 'Autofactura electrónica',
  NOTA_CREDITO_ELECTRONICA: 'Nota de crédito electrónica',
  NOTA_DEBITO_ELECTRONICA: 'Nota de débito electrónica',
  NOTA_REMISION_ELECTRONICA: 'Nota de remisión electrónica',
};

export const ITIPCONT_POR_TIPO: Record<TipoContribuyente, string> = {
  FISICA: '1',
  JURIDICA: '2',
};

export const ITIPEMI_POR_TIPO: Record<TipoEmisionDE, string> = {
  NORMAL: '1',
  CONTINGENCIA: '2',
};

export const DESC_TIPEMI_POR_TIPO: Record<TipoEmisionDE, string> = {
  NORMAL: 'Normal',
  CONTINGENCIA: 'Contingencia',
};

// Varios enums de este proyecto (MotivoEmisionNotaRemision,
// ResponsableEmisionNotaRemision, TipoTransporte, ModalidadTransporte,
// ResponsableFlete, TipoIdentificacionVehiculo, NaturalezaTransportista,
// NaturalezaVendedorAutofactura...) se declararon a proposito en el mismo
// orden que la tabla numerada del Manual Tecnico SIFEN v150 (ver los
// comentarios "E5xx"/"E9xx" en prisma/schema.prisma) -- el codigo SIFEN de
// cada valor es simplemente su posicion (1-based) dentro del enum. Este
// helper evita mantener un mapa manual por cada uno, con el riesgo de
// transcripcion que eso implica.
export function codigoPorPosicion<T extends Record<string, string>>(enumObj: T, valor: T[keyof T]): string {
  const claves = Object.keys(enumObj);
  const posicion = claves.indexOf(valor as string);
  if (posicion === -1) {
    throw new Error(`codigoPorPosicion: valor "${valor}" no encontrado en el enum`);
  }
  return String(posicion + 1);
}
