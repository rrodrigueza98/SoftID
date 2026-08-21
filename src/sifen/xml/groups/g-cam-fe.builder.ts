import type { CondicionCredito, CondicionVenta, MotivoEmisionNotaCD, TipoDocumentoElectronico } from '@prisma/client';
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

export interface DatosGCamFE {
  tipoDocumento: TipoDocumentoElectronico;
  condicionVenta: CondicionVenta;
  condicionCredito?: CondicionCredito | null;
  plazoCredito?: string | null;
  cantidadCuotas?: number | null;
  // Solo para NC/ND: referencia al comprobante original.
  notaCreditoDebito?: {
    motivoEmision: MotivoEmisionNotaCD;
    cdcComprobanteAsociado: string;
  };
}

// gCamFE -- condicion de la operacion (Manual Tecnico SIFEN v150, E6), mas
// gCamNCDE cuando el documento es Nota de Credito/Debito (referencia al
// comprobante que ajusta).
export function buildGCamFE(parent: XmlNode, datos: DatosGCamFE): void {
  const gCamFE = parent.ele('gCamFE');

  const esCredito = datos.condicionVenta === 'CREDITO';
  gCamFE
    .ele('iCondOpe')
    .txt(esCredito ? '2' : '1')
    .up()
    .ele('dDCondOpe')
    .txt(esCredito ? 'Crédito' : 'Contado')
    .up();

  if (esCredito && datos.condicionCredito) {
    const gPagCred = gCamFE.ele('gPagCred').ele('iCondCred').txt(datos.condicionCredito === 'PLAZO' ? '1' : '2').up();
    if (datos.condicionCredito === 'PLAZO' && datos.plazoCredito) {
      gPagCred.ele('dPlazoCre').txt(datos.plazoCredito).up();
    }
    if (datos.condicionCredito === 'CUOTA' && datos.cantidadCuotas) {
      gPagCred.ele('dCuotas').txt(String(datos.cantidadCuotas)).up();
    }
    gPagCred.up();
  }

  gCamFE.up();

  if (datos.notaCreditoDebito) {
    parent
      .ele('gCamNCDE')
      .ele('iMotEmi')
      .txt(IMOTEMI_POR_MOTIVO[datos.notaCreditoDebito.motivoEmision])
      .up()
      .ele('dDesMotEmi')
      .txt(datos.notaCreditoDebito.motivoEmision)
      .up()
      .up();

    // Referencia al DE original -- va en gGrupGen/gCamDEAsoc segun el manual;
    // se modela como bloque propio para que quede claro que es un campo
    // pendiente de ubicar en su grupo exacto del XSD (ver plan, "cosas a
    // verificar").
    parent.ele('gCamDEAsoc').ele('iTipDocAso').txt('1').up().ele('dCdCDERef').txt(datos.notaCreditoDebito.cdcComprobanteAsociado).up().up();
  }
}
