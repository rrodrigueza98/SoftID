import type { TipoDocumentoElectronico } from '../lib/types';

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'Factura Electrónica',
  NOTA_CREDITO_ELECTRONICA: 'Nota de Crédito Electrónica',
  NOTA_DEBITO_ELECTRONICA: 'Nota de Débito Electrónica',
  AUTOFACTURA_ELECTRONICA: 'Autofactura Electrónica',
  NOTA_REMISION_ELECTRONICA: 'Nota de Remisión Electrónica',
  COMPROBANTE_RETENCION_ELECTRONICO: 'Comprobante de Retención Electrónico',
};

export const TIPO_DOCUMENTO_ABREVIADO: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'FE',
  NOTA_CREDITO_ELECTRONICA: 'NCE',
  NOTA_DEBITO_ELECTRONICA: 'NDE',
  AUTOFACTURA_ELECTRONICA: 'AFE',
  NOTA_REMISION_ELECTRONICA: 'NRE',
  COMPROBANTE_RETENCION_ELECTRONICO: 'CRE',
};
