import { buildGDatRec, type DatosGDatRec } from './g-dat-rec.builder';
import { buildGEmis, type DatosGEmis } from './g-emis.builder';
import { type XmlNode, num } from './xml-node';

export interface DatosGDatGralOpe {
  fechaEmision: Date;
  moneda: string; // "PYG" u otra
  tipoCambio?: number | null;
  emisor: DatosGEmis;
  receptor: DatosGDatRec;
}

// gDatGralOpe -- datos generales de la operacion (Manual Tecnico SIFEN v150,
// E2): fecha, gOpeCom (moneda/tipo de cambio), gEmis, gDatRec.
export function buildGDatGralOpe(parent: XmlNode, datos: DatosGDatGralOpe): void {
  const gDatGralOpe = parent
    .ele('gDatGralOpe')
    .ele('dFeEmiDE')
    .txt(datos.fechaEmision.toISOString())
    .up();

  const esExtranjera = datos.moneda !== 'PYG';
  const gOpeCom = gDatGralOpe
    .ele('gOpeCom')
    .ele('cMoneOpe')
    .txt(datos.moneda)
    .up()
    .ele('dDesMoneOpe')
    .txt(esExtranjera ? datos.moneda : 'Guarani')
    .up();

  if (esExtranjera && datos.tipoCambio) {
    gOpeCom.ele('dCondTiCam').txt('1').up().ele('dTiCam').txt(num(datos.tipoCambio, 4)).up();
  }
  gOpeCom.up();

  buildGEmis(gDatGralOpe, datos.emisor);
  buildGDatRec(gDatGralOpe, datos.receptor);

  gDatGralOpe.up();
}
