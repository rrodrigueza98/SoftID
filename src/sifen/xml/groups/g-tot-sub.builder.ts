import { type XmlNode, num } from './xml-node';

export interface DatosGTotSub {
  subtotalExenta: number;
  subtotalGravada5: number;
  subtotalGravada10: number;
  iva5: number;
  iva10: number;
  total: number;
}

// gTotSub -- subtotales y totales de la operacion (Manual Tecnico SIFEN
// v150, E8). Se omiten los campos de descuento/anticipo/redondeo/comision
// globales -- SoftID no los maneja a nivel comprobante hoy (los descuentos
// son por item, ya reflejados en gValorRestaItem).
export function buildGTotSub(parent: XmlNode, datos: DatosGTotSub): void {
  const subExe = num(datos.subtotalExenta, 2);
  const sub5 = num(datos.subtotalGravada5, 2);
  const sub10 = num(datos.subtotalGravada10, 2);
  const totOpe = num(datos.subtotalExenta + datos.subtotalGravada5 + datos.subtotalGravada10, 2);
  const totalIva5 = num(datos.iva5, 2);
  const totalIva10 = num(datos.iva10, 2);
  const totalIva = num(datos.iva5 + datos.iva10, 2);
  // Base gravada = subtotal del tramo menos el propio IVA de ese tramo.
  const baseGrav5 = num(datos.subtotalGravada5 - datos.iva5, 2);
  const baseGrav10 = num(datos.subtotalGravada10 - datos.iva10, 2);

  parent
    .ele('gTotSub')
    .ele('dSubExe')
    .txt(subExe)
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
    .ele('dTotalGs')
    .txt(num(datos.total, 2))
    .up()
    .ele('dNetoIVA5')
    .txt(baseGrav5)
    .up()
    .ele('dNetoIVA10')
    .txt(baseGrav10)
    .up()
    .ele('dTotalIVA5')
    .txt(totalIva5)
    .up()
    .ele('dTotalIVA10')
    .txt(totalIva10)
    .up()
    .ele('dTotalIVA')
    .txt(totalIva)
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
    .up();
}
