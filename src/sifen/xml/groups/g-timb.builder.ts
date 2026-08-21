import type { Timbrado } from '@prisma/client';
import { DESC_TIDE_POR_TIPO, ITIDE_POR_TIPO } from '../catalogos';
import { type XmlNode } from './xml-node';

export interface DatosGTimb {
  timbrado: Pick<Timbrado, 'tipoDocumento' | 'numeroTimbrado' | 'fechaInicioVigencia'>;
  numero: string; // Comprobante.numero, 7 digitos
  codigoEstablecimiento: string; // 3 digitos
  codigoPuntoExpedicion: string; // 3 digitos
}

// gTimb -- datos del timbrado (Manual Tecnico SIFEN v150, E1).
export function buildGTimb(parent: XmlNode, datos: DatosGTimb): void {
  const iTiDE = ITIDE_POR_TIPO[datos.timbrado.tipoDocumento];
  const dDesTiDE = DESC_TIDE_POR_TIPO[datos.timbrado.tipoDocumento];
  if (!iTiDE || !dDesTiDE) {
    throw new Error(`buildGTimb: tipoDocumento ${datos.timbrado.tipoDocumento} sin mapeo SIFEN`);
  }

  parent
    .ele('gTimb')
    .ele('iTiDE')
    .txt(iTiDE)
    .up()
    .ele('dDesTiDE')
    .txt(dDesTiDE)
    .up()
    .ele('dNumTim')
    .txt(datos.timbrado.numeroTimbrado)
    .up()
    .ele('dEst')
    .txt(datos.codigoEstablecimiento)
    .up()
    .ele('dPunExp')
    .txt(datos.codigoPuntoExpedicion)
    .up()
    .ele('dNumDoc')
    .txt(datos.numero)
    .up()
    .ele('dFeIniT')
    .txt(datos.timbrado.fechaInicioVigencia.toISOString().slice(0, 10))
    .up()
    .up();
}
