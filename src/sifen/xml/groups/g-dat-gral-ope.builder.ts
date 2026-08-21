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
// E2): fecha, gOpeCom (tipo de transaccion/impuesto, moneda/tipo de
// cambio), gEmis, gDatRec. Orden y nombres de campo verificados contra
// DE_v150.xsd (ekuatia.set.gov.py/sifen/xsd/DE_v150.xsd) el 2026-08-21.
export function buildGDatGralOpe(parent: XmlNode, datos: DatosGDatGralOpe): void {
  const gDatGralOpe = parent
    .ele('gDatGralOpe')
    .ele('dFeEmiDE')
    .txt(datos.fechaEmision.toISOString())
    .up();

  const esExtranjera = datos.moneda !== 'PYG';
  const gOpeCom = gDatGralOpe
    .ele('gOpeCom')
    // iTipTra/iTImp -- SoftID no distingue tipo de transaccion por
    // comprobante (mercaderia/servicio/mixto) ni impuestos distintos de
    // IVA todavia -- se usa el default mas comun (1=venta de mercaderia,
    // 1=IVA) hasta modelarlo explicitamente.
    .ele('iTipTra')
    .txt('1')
    .up()
    .ele('dDesTipTra')
    .txt('Venta de mercadería')
    .up()
    .ele('iTImp')
    .txt('1')
    .up()
    .ele('dDesTImp')
    .txt('IVA')
    .up()
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
