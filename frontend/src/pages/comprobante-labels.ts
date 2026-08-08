import type {
  ModalidadTransporte,
  MotivoEmisionNotaRemision,
  NaturalezaTransportista,
  NaturalezaVendedorAutofactura,
  ResponsableEmisionNotaRemision,
  ResponsableFlete,
  TipoDocumentoElectronico,
  TipoDocumentoIdentidad,
  TipoTransporte,
} from '../lib/types';

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'Factura Electrónica',
  NOTA_CREDITO_ELECTRONICA: 'Nota de Crédito Electrónica',
  NOTA_DEBITO_ELECTRONICA: 'Nota de Débito Electrónica',
  AUTOFACTURA_ELECTRONICA: 'Autofactura Electrónica',
  NOTA_REMISION_ELECTRONICA: 'Nota de Remisión Electrónica',
  COMPROBANTE_RETENCION_ELECTRONICO: 'Comprobante de Retención Electrónico',
};

// Version sin el sufijo "Electronica/o", para timbrados tradicionales
// (esElectronico = false), donde el comprobante es solo numerado y no
// tiene ninguna de las exigencias de SIFEN.
export const TIPO_DOCUMENTO_LABEL_TRADICIONAL: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'Factura',
  NOTA_CREDITO_ELECTRONICA: 'Nota de Crédito',
  NOTA_DEBITO_ELECTRONICA: 'Nota de Débito',
  AUTOFACTURA_ELECTRONICA: 'Autofactura',
  NOTA_REMISION_ELECTRONICA: 'Nota de Remisión',
  COMPROBANTE_RETENCION_ELECTRONICO: 'Comprobante de Retención',
};

export function tipoDocumentoLabel(tipo: TipoDocumentoElectronico, esElectronico: boolean): string {
  return esElectronico ? TIPO_DOCUMENTO_LABEL[tipo] : TIPO_DOCUMENTO_LABEL_TRADICIONAL[tipo];
}

export const TIPO_DOCUMENTO_ABREVIADO: Record<TipoDocumentoElectronico, string> = {
  FACTURA_ELECTRONICA: 'FE',
  NOTA_CREDITO_ELECTRONICA: 'NCE',
  NOTA_DEBITO_ELECTRONICA: 'NDE',
  AUTOFACTURA_ELECTRONICA: 'AFE',
  NOTA_REMISION_ELECTRONICA: 'NRE',
  COMPROBANTE_RETENCION_ELECTRONICO: 'CRE',
};

// Etiquetas del bloque de transporte de la Nota de Remision (grupos E6/E10
// del Manual Tecnico SIFEN v150) -- compartidas entre el formulario de
// emision y la representacion grafica (KuDE), para que no se desincronicen.
export const MOTIVO_REMISION_LABEL: Record<MotivoEmisionNotaRemision, string> = {
  TRASLADO_POR_VENTA: 'Traslado por venta',
  TRASLADO_POR_CONSIGNACION: 'Traslado por consignación',
  EXPORTACION: 'Exportación',
  TRASLADO_POR_COMPRA: 'Traslado por compra',
  IMPORTACION: 'Importación',
  TRASLADO_POR_DEVOLUCION: 'Traslado por devolución',
  TRASLADO_ENTRE_LOCALES: 'Traslado entre locales de la empresa',
  TRASLADO_POR_TRANSFORMACION: 'Traslado de bienes por transformación',
  TRASLADO_POR_REPARACION: 'Traslado de bienes por reparación',
  TRASLADO_POR_EMISOR_MOVIL: 'Traslado por emisor móvil',
  EXHIBICION_O_DEMOSTRACION: 'Exhibición o demostración',
  PARTICIPACION_EN_FERIAS: 'Participación en ferias',
  TRASLADO_DE_ENCOMIENDA: 'Traslado de encomienda',
  DECOMISO: 'Decomiso',
  OTRO: 'Otro',
};

export const RESPONSABLE_EMISION_REMISION_LABEL: Record<ResponsableEmisionNotaRemision, string> = {
  EMISOR_FACTURA: 'Emisor de la factura',
  POSEEDOR_FACTURA_Y_BIENES: 'Poseedor de la factura y bienes',
  EMPRESA_TRANSPORTISTA: 'Empresa transportista',
  DESPACHANTE_ADUANAS: 'Despachante de aduanas',
  AGENTE_TRANSPORTE: 'Agente de transporte o intermediario',
};

export const RESPONSABLE_FLETE_LABEL: Record<ResponsableFlete, string> = {
  EMISOR_FACTURA: 'Emisor de la factura',
  RECEPTOR_FACTURA: 'Receptor de la factura',
  TERCERO: 'Tercero',
  AGENTE_INTERMEDIARIO: 'Agente intermediario del transporte',
  TRANSPORTE_PROPIO: 'Transporte propio',
};

export const MODALIDAD_TRANSPORTE_LABEL: Record<ModalidadTransporte, string> = {
  TERRESTRE: 'Terrestre',
  FLUVIAL: 'Fluvial',
  AEREO: 'Aéreo',
  MULTIMODAL: 'Multimodal',
};

export const TIPO_TRANSPORTE_LABEL: Record<TipoTransporte, string> = {
  PROPIO: 'Propio',
  TERCERO: 'Tercero',
};

export const NATURALEZA_TRANSPORTISTA_LABEL: Record<NaturalezaTransportista, string> = {
  CONTRIBUYENTE: 'Contribuyente',
  NO_CONTRIBUYENTE: 'No contribuyente',
};

export const TIPO_DOCUMENTO_IDENTIDAD_LABEL: Record<TipoDocumentoIdentidad, string> = {
  RUC: 'RUC',
  CEDULA_PARAGUAYA: 'Cédula paraguaya',
  PASAPORTE: 'Pasaporte',
  CEDULA_EXTRANJERA: 'Cédula extranjera',
  CARNET_RESIDENCIA: 'Carnet de residencia',
  INNOMINADO: 'Consumidor final',
  TARJETA_DIPLOMATICA: 'Tarjeta diplomática',
  OTRO: 'Otro',
};

// Etiquetas del bloque de vendedor/lugar de la transaccion de la
// Autofactura Electronica (grupo E4 del Manual Tecnico SIFEN v150).
export const NATURALEZA_VENDEDOR_AUTOFACTURA_LABEL: Record<NaturalezaVendedorAutofactura, string> = {
  NO_CONTRIBUYENTE: 'No contribuyente',
  EXTRANJERO: 'Extranjero',
};
