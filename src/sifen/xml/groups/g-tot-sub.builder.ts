import { type XmlNode, num } from './xml-node';

export interface DatosGTotSub {
  subtotalExenta: number;
  subtotalGravada5: number;
  subtotalGravada10: number;
  iva5: number;
  iva10: number;
  total: number;
  moneda: string;
}

// gTotSub -- subtotales y totales de la operacion. Orden y nombres de
// campo verificados contra DE_v150.xsd (ekuatia.set.gov.py/sifen/xsd/
// DE_v150.xsd) el 2026-08-21, y las FORMULAS (no solo los nombres)
// reverificadas 2026-08-21 contra un DE real ya aprobado para esta empresa,
// despues de un rechazo real: "Calculo del subtotal de la operacion gravada
// al 10% incorrecto".
//
// Comprobante.subtotalGravada10/5 son la BASE imponible (sin IVA) de cada
// tramo -- así lo calcula calcularSubtotales() en comprobantes.util.ts, a
// proposito para que el Libro de Ventas cuadre (Total = Exenta + Gravada +
// IVA). Pero dSub10/dSub5 de SIFEN son el monto BRUTO de cada tramo (base +
// su propio IVA) -- confirmado en el DE real (dSub10=60000 = dBaseGrav10
// 54545.45... + dIVA10 5454.54...). La version anterior asumia lo
// contrario (que subtotalGravada10 ya era el bruto), lo que ademas hacia
// que dBaseGrav10/dIVA10 salieran mal (les restaba el IVA dos veces).
//
// dLiqTotIVA5/dLiqTotIVA10 (opcionales) se omiten a proposito: el DE real
// no los trae, solo dIVA5/dIVA10.
//
// PENDIENTE: dSubExo (subtotal EXONERADO, distinto de exento) siempre sale
// en 0 -- Comprobante no separa un subtotal de exonerado del de exento
// todavia (AfectacionIVA.EXONERADO existe a nivel de item pero no se
// acumula en un campo propio del comprobante). Se omiten los campos de
// comision (dComi/dIVAComi), no aplicables.
export function buildGTotSub(parent: XmlNode, datos: DatosGTotSub): void {
  const bruto5 = datos.subtotalGravada5 + datos.iva5;
  const bruto10 = datos.subtotalGravada10 + datos.iva10;

  const subExe = num(datos.subtotalExenta, 2);
  const sub5 = num(bruto5, 2);
  const sub10 = num(bruto10, 2);
  const totOpe = num(datos.subtotalExenta + bruto5 + bruto10, 2);
  const totIva = num(datos.iva5 + datos.iva10, 2);
  const baseGrav5 = num(datos.subtotalGravada5, 2);
  const baseGrav10 = num(datos.subtotalGravada10, 2);
  const iva5 = num(datos.iva5, 2);
  const iva10 = num(datos.iva10, 2);

  const gTotSub = parent.ele('gTotSub');
  gTotSub
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
    .txt(iva5)
    .up()
    .ele('dIVA10')
    .txt(iva10)
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
    .up();

  // dTotalGs (total convertido a guaranies) solo aplica cuando la moneda de
  // la operacion NO es guaranies -- rechazo real: "El total general de la
  // operacion en guaranies no requerido para el tipo de moneda de la
  // operacion" (lo mandaba siempre, tambien para PYG). Confirmado ademas
  // contra un DE real en PYG para esta empresa, que no trae este campo.
  if (datos.moneda !== 'PYG') {
    gTotSub.ele('dTotalGs').txt(num(datos.total, 2)).up();
  }

  gTotSub.up();
}
