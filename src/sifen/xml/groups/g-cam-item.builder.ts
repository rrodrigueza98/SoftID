import type { AfectacionIVA, ComprobanteItem, UnidadMedida } from '@prisma/client';
import { type XmlNode, num } from './xml-node';

const IAFECIVA_POR_TIPO: Record<AfectacionIVA, string> = {
  GRAVADO: '1',
  EXONERADO: '2',
  EXENTO: '3',
  GRAVADO_PARCIAL: '4',
};

const DESC_AFECIVA_POR_TIPO: Record<AfectacionIVA, string> = {
  GRAVADO: 'Gravado IVA',
  EXONERADO: 'Exonerado',
  EXENTO: 'Exento',
  GRAVADO_PARCIAL: 'Gravado parcial (Exento y Gravado)',
};

export type ItemConUnidad = ComprobanteItem & { unidadMedida: Pick<UnidadMedida, 'codigoSifen' | 'descripcion'> };

// gCamItem -- uno por cada ComprobanteItem (Manual Tecnico SIFEN v150, E7).
export function buildGCamItem(parent: XmlNode, items: ItemConUnidad[]): void {
  for (const item of items) {
    const gCamItem = parent
      .ele('gCamItem')
      .ele('dDesProSer')
      .txt(item.descripcion)
      .up()
      .ele('cUniMed')
      .txt(item.unidadMedida.codigoSifen)
      .up()
      .ele('dDesUniMed')
      .txt(item.unidadMedida.descripcion)
      .up()
      .ele('dCantProSer')
      .txt(num(item.cantidad, 3))
      .up();

    const gValorItem = gCamItem
      .ele('gValorItem')
      .ele('dPUniProSer')
      .txt(num(item.precioUnitario, 2))
      .up()
      .ele('dTotBruOpeItem')
      .txt(num(Number(item.precioUnitario) * Number(item.cantidad), 2))
      .up();

    // gValorRestaItem -- verificado contra DE_v150.xsd el 2026-08-21: NO es
    // opcional-solo-si-hay-descuento como se habia asumido antes; dTotOpeItem
    // (el total final del item) vive DENTRO de este grupo, no como hijo
    // directo de gValorItem (error anterior, ya corregido). Va siempre.
    const gValorRestaItem = gValorItem.ele('gValorRestaItem');
    if (Number(item.descuento) > 0) {
      gValorRestaItem.ele('dDescItem').txt(num(item.descuento, 2)).up();
    }
    gValorRestaItem.ele('dTotOpeItem').txt(num(item.total, 2)).up();
    gValorRestaItem.up();

    gValorItem.up(); // cierra gValorItem, vuelve a gCamItem

    const gCamIVA = gCamItem
      .ele('gCamIVA')
      .ele('iAfecIVA')
      .txt(IAFECIVA_POR_TIPO[item.afectacionIva])
      .up()
      .ele('dDesAfecIVA')
      .txt(DESC_AFECIVA_POR_TIPO[item.afectacionIva])
      .up();

    if (item.proporcionGravada != null) {
      gCamIVA.ele('dPropIVA').txt(num(item.proporcionGravada, 2)).up();
    }
    gCamIVA
      .ele('dTasaIVA')
      .txt(String(item.tasaIva))
      .up()
      .ele('dBasGravIVA')
      .txt(num(item.montoGravado, 2))
      .up()
      .ele('dLiqIVAItem')
      .txt(num(item.liquidacionIva, 2))
      .up()
      .ele('dBasExe')
      .txt(num(item.montoExenta, 2))
      .up()
      .up(); // cierra gCamIVA

    gCamItem.up();
  }
}
