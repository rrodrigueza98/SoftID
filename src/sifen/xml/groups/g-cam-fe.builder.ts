import type { CondicionCredito, CondicionVenta, MotivoEmisionNotaCD } from '@prisma/client';
import { type XmlNode } from './xml-node';

const IMOTEMI_POR_MOTIVO: Record<MotivoEmisionNotaCD, string> = {
  DEVOLUCION_Y_AJUSTE_PRECIOS: '1',
  DEVOLUCION: '2',
  DESCUENTO: '3',
  BONIFICACION: '4',
  CREDITO_INCOBRABLE: '5',
  RECUPERO_DE_COSTO: '6',
  RECUPERO_DE_GASTO: '7',
  AJUSTE_DE_PRECIO: '8',
};

// gCamFE -- campos especificos de Factura Electronica (Manual Tecnico SIFEN
// v150). Solo se envia iIndPres (indicador de presencia): SoftID no
// distingue todavia si la operacion fue presencial, por telefono, comercio
// electronico, etc, asi que se usa "1 = Operacion presencial" como default
// -- es el caso mas comun para POS/Facturacion manual. dFecEmNR/gCompPub
// (venta a futuro / factura futura de una remision) no se modelan.
export function buildGCamFE(parent: XmlNode): void {
  parent.ele('gCamFE').ele('iIndPres').txt('1').up().ele('dDesIndPres').txt('Operación presencial').up().up();
}

export interface DatosGCamCond {
  condicionVenta: CondicionVenta;
  condicionCredito?: CondicionCredito | null;
  plazoCredito?: string | null;
  cantidadCuotas?: number | null;
}

// gCamCond -- condicion de la operacion: contado o credito (Manual Tecnico
// SIFEN v150). Verificado contra DE_v150.xsd el 2026-08-21 -- iCondOpe/
// dDCondOpe/gPagCred viven aca, NO dentro de gCamFE (error anterior, ya
// corregido).
export function buildGCamCond(parent: XmlNode, datos: DatosGCamCond): void {
  const gCamCond = parent.ele('gCamCond');
  const esCredito = datos.condicionVenta === 'CREDITO';

  gCamCond
    .ele('iCondOpe')
    .txt(esCredito ? '2' : '1')
    .up()
    .ele('dDCondOpe')
    .txt(esCredito ? 'Crédito' : 'Contado')
    .up();

  if (esCredito && datos.condicionCredito) {
    const gPagCred = gCamCond.ele('gPagCred').ele('iCondCred').txt(datos.condicionCredito === 'PLAZO' ? '1' : '2').up();
    if (datos.condicionCredito === 'PLAZO' && datos.plazoCredito) {
      gPagCred.ele('dPlazoCre').txt(datos.plazoCredito).up();
    }
    if (datos.condicionCredito === 'CUOTA' && datos.cantidadCuotas) {
      gPagCred.ele('dCuotas').txt(String(datos.cantidadCuotas)).up();
    }
    gPagCred.up();
  }

  gCamCond.up();
}

// gCamNCDE -- motivo de emision de Nota de Credito/Debito. Solo iMotEmi/
// dDesMotEmi (la referencia al DE original va aparte, como gCamDEAsoc a
// nivel de <DE>, no dentro de este grupo -- ver xml-builder.ts).
export function buildGCamNcde(parent: XmlNode, motivoEmision: MotivoEmisionNotaCD): void {
  parent.ele('gCamNCDE').ele('iMotEmi').txt(IMOTEMI_POR_MOTIVO[motivoEmision]).up().ele('dDesMotEmi').txt(motivoEmision).up().up();
}
