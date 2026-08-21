import { type XmlNode, num } from './xml-node';

export interface DatosGTotSub {
  subtotalExenta: number;
  subtotalGravada5: number;
  subtotalGravada10: number;
  iva5: number;
  iva10: number;
  total: number;
}

// gTotSub -- subtotales y totales de la operacion. Orden y nombres de
// campo verificados contra DE_v150.xsd (ekuatia.set.gov.py/sifen/xsd/
// DE_v150.xsd) el 2026-08-21 -- la version anterior tenia varios nombres
// inventados (dNetoIVA5/10, dTotalIVA5/10, dTotalIVA) que no existen en el
// schema real (son dIVA5/10, dLiqTotIVA5/10, dTotIVA), y dTotalGs estaba
// ubicado a mitad de la secuencia en vez de al final.
//
// PENDIENTE: dSubExo (subtotal EXONERADO, distinto de exento) siempre sale
// en 0 -- Comprobante no separa un subtotal de exonerado del de exento
// todavia (AfectacionIVA.EXONERADO existe a nivel de item pero no se
// acumula en un campo propio del comprobante). Se omiten los campos de
// comision (dComi/dIVAComi), no aplicables.
export function buildGTotSub(parent: XmlNode, datos: DatosGTotSub): void {
  const subExe = num(datos.subtotalExenta, 2);
  const sub5 = num(datos.subtotalGravada5, 2);
  const sub10 = num(datos.subtotalGravada10, 2);
  const totOpe = num(datos.subtotalExenta + datos.subtotalGravada5 + datos.subtotalGravada10, 2);
  const liqTotIva5 = num(datos.iva5, 2);
  const liqTotIva10 = num(datos.iva10, 2);
  const totIva = num(datos.iva5 + datos.iva10, 2);
  // Base gravada = subtotal del tramo menos el propio IVA de ese tramo.
  const baseGrav5 = num(datos.subtotalGravada5 - datos.iva5, 2);
  const baseGrav10 = num(datos.subtotalGravada10 - datos.iva10, 2);

  parent
    .ele('gTotSub')
    .ele('dSubExe')
    .txt(subExe)
    .up()
    .ele('dSubExo')
    .txt('0.00')
    .up()
    .ele('dSub5')
    .txt(sub5)
    .up()
    .ele('dSub10')
    .txt(sub10)
    .up()
    .ele('dTotOpe')
    .txt(totOpe)
    .up()
    .ele('dTotDesc')
    .txt('0.00')
    .up()
    .ele('dTotDescGlotem')
    .txt('0.00')
    .up()
    .ele('dTotAntItem')
    .txt('0.00')
    .up()
    .ele('dTotAnt')
    .txt('0.00')
    .up()
    .ele('dPorcDescTotal')
    .txt('0.00')
    .up()
    .ele('dDescTotal')
    .txt('0.00')
    .up()
    .ele('dAnticipo')
    .txt('0.00')
    .up()
    .ele('dRedon')
    .txt('0.00')
    .up()
    .ele('dTotGralOpe')
    .txt(totOpe)
    .up()
    .ele('dIVA5')
    .txt(baseGrav5)
    .up()
    .ele('dIVA10')
    .txt(baseGrav10)
    .up()
    .ele('dLiqTotIVA5')
    .txt(liqTotIva5)
    .up()
    .ele('dLiqTotIVA10')
    .txt(liqTotIva10)
    .up()
    .ele('dTotIVA')
    .txt(totIva)
    .up()
    .ele('dBaseGrav5')
    .txt(baseGrav5)
    .up()
    .ele('dBaseGrav10')
    .txt(baseGrav10)
    .up()
    .ele('dTBasGraIVA')
    .txt(num(datos.subtotalGravada5 + datos.subtotalGravada10, 2))
    .up()
    .ele('dTotalGs')
    .txt(num(datos.total, 2))
    .up()
    .up();
}
