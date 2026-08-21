import { create } from 'xmlbuilder2';
import type {
  Comprobante,
  ComprobanteItem,
  DatosTransporteRemision,
  DatosVendedorAutofactura,
  Empresa,
  Establecimiento,
  PuntoExpedicion,
  Tercero,
  Timbrado,
  UnidadMedida,
} from '@prisma/client';
import { DESC_TIPEMI_POR_TIPO, ITIPEMI_POR_TIPO } from './catalogos';
import { buildGCamAe } from './groups/g-cam-ae.builder';
import { buildGCamCond, buildGCamFE, buildGCamNcde } from './groups/g-cam-fe.builder';
import { buildGCamItem, type ItemConUnidad } from './groups/g-cam-item.builder';
import { buildGCamNre, buildGTransp } from './groups/g-cam-nre.builder';
import { buildGDatGralOpe } from './groups/g-dat-gral-ope.builder';
import { buildGTimb } from './groups/g-timb.builder';
import { buildGTotSub } from './groups/g-tot-sub.builder';

export type ComprobanteParaXml = Comprobante & {
  items: (ComprobanteItem & { unidadMedida: Pick<UnidadMedida, 'codigoSifen' | 'descripcion'> })[];
  timbrado: Timbrado & { puntoExpedicion: PuntoExpedicion & { establecimiento: Establecimiento & { empresa: Empresa } } };
  cliente: Tercero | null;
  proveedor: Tercero | null;
  datosTransporteRemision: DatosTransporteRemision | null;
  datosVendedorAutofactura: DatosVendedorAutofactura | null;
};

export interface BuildXmlDeParams {
  comprobante: ComprobanteParaXml;
  cdc: string;
  codigoSeguridad: string;
  cdcComprobanteAsociado?: string; // requerido si es NC/ND (comprobanteAsociadoId apunta a una factura ya aprobada)
}

// Arma el XML del rDE (Documento Electronico) sin firmar, siguiendo el
// esqueleto del Manual Tecnico SIFEN v150. La firma XAdES-BES se aplica
// despues, en signing/xades.signer.ts.
//
// Orden y nombres de grupo verificados contra DE_v150.xsd
// (ekuatia.set.gov.py/sifen/xsd/DE_v150.xsd) el 2026-08-21, corrigiendo
// varios errores de una version anterior armada solo de memoria (grupos
// mezclados como gCamFE/gCamCond, campos inventados en gDatRec, gTransp mal
// ubicado, gTotSub con nombres de campo equivocados). Sigue habiendo
// simplificaciones documentadas en cada builder de grupo (ver comentarios
// "PENDIENTE") -- ver plan de implementacion, "Cosas a verificar".
export function buildXmlDe(params: BuildXmlDeParams): string {
  const { comprobante, cdc, codigoSeguridad } = params;
  const puntoExpedicion = comprobante.timbrado.puntoExpedicion;
  const establecimiento = puntoExpedicion.establecimiento;
  const empresa = establecimiento.empresa;
  const receptor = comprobante.cliente ?? comprobante.proveedor;
  if (!receptor) {
    throw new Error(`buildXmlDe: comprobante ${comprobante.id} no tiene cliente ni proveedor asociado`);
  }

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('rDE', {
    xmlns: 'http://ekuatia.set.gov.py/sifen/xsd',
  });

  doc.ele('dVerFor').txt('150').up();

  const de = doc.ele('DE', { Id: cdc });

  de.ele('dDVId').txt(cdc.slice(-1)).up();
  de.ele('dFecFirma').txt(new Date().toISOString()).up();
  de.ele('dSisFact').txt('1').up();

  de.ele('gOpeDE')
    .ele('iTipEmi')
    .txt(ITIPEMI_POR_TIPO.NORMAL)
    .up()
    .ele('dDesTipEmi')
    .txt(DESC_TIPEMI_POR_TIPO.NORMAL)
    .up()
    .ele('dCodSeg')
    .txt(codigoSeguridad)
    .up()
    .up();

  buildGTimb(de, {
    timbrado: comprobante.timbrado,
    numero: comprobante.numero,
    codigoEstablecimiento: establecimiento.codigo,
    codigoPuntoExpedicion: puntoExpedicion.codigo,
  });

  buildGDatGralOpe(de, {
    fechaEmision: comprobante.fechaEmision,
    moneda: comprobante.moneda,
    tipoCambio: comprobante.tipoCambio ? Number(comprobante.tipoCambio) : null,
    emisor: { empresa, establecimiento },
    receptor: { tercero: receptor },
  });

  const gDtipDE = de.ele('gDtipDE');

  // Orden real dentro de gDtipDE: gCamFE, gCamAE, gCamNCDE, gCamNRE,
  // gCamCond, gCamItem, (gTransp despues de gCamItem, ver mas abajo).
  const esFacturaOAutofactura =
    comprobante.tipoDocumento === 'FACTURA_ELECTRONICA' || comprobante.tipoDocumento === 'AUTOFACTURA_ELECTRONICA';
  if (esFacturaOAutofactura) {
    buildGCamFE(gDtipDE);
  }

  if (comprobante.datosVendedorAutofactura) {
    buildGCamAe(gDtipDE, comprobante.datosVendedorAutofactura);
  }

  if (comprobante.motivoEmision) {
    buildGCamNcde(gDtipDE, comprobante.motivoEmision);
  }

  if (comprobante.datosTransporteRemision) {
    buildGCamNre(gDtipDE, comprobante.datosTransporteRemision);
  }

  buildGCamCond(gDtipDE, {
    condicionVenta: comprobante.condicionVenta,
    condicionCredito: comprobante.condicionCredito,
    plazoCredito: comprobante.plazoCredito,
    cantidadCuotas: comprobante.cantidadCuotas,
  });

  buildGCamItem(gDtipDE, comprobante.items as ItemConUnidad[]);

  if (comprobante.datosTransporteRemision) {
    buildGTransp(gDtipDE, comprobante.datosTransporteRemision);
  }

  gDtipDE.up();

  buildGTotSub(de, {
    subtotalExenta: Number(comprobante.subtotalExenta),
    subtotalGravada5: Number(comprobante.subtotalGravada5),
    subtotalGravada10: Number(comprobante.subtotalGravada10),
    iva5: Number(comprobante.iva5),
    iva10: Number(comprobante.iva10),
    total: Number(comprobante.total),
  });

  // gCamDEAsoc -- referencia al DE original de una NC/ND. Va como hijo
  // directo de <DE>, hermano de gTotSub (NO dentro de gDtipDE, error
  // anterior ya corregido) -- verificado contra DE_v150.xsd el 2026-08-21.
  if (comprobante.motivoEmision && params.cdcComprobanteAsociado) {
    de.ele('gCamDEAsoc').ele('iTipDocAso').txt('1').up().ele('dCdCDERef').txt(params.cdcComprobanteAsociado).up().up();
  }

  de.up();
  doc.up();

  return doc.end({ prettyPrint: false });
}
