import type { Tercero } from '@prisma/client';
import { type XmlNode } from './xml-node';

// iTipIDRec -- solo se usa cuando el receptor NO es contribuyente (no tiene
// RUC). Mismos codigos que documenta el propio enum TipoDocumentoIdentidad.
const ITIPIDREC_POR_TIPO: Partial<Record<Tercero['tipoDocumento'], string>> = {
  CEDULA_PARAGUAYA: '1',
  PASAPORTE: '2',
  CEDULA_EXTRANJERA: '3',
  CARNET_RESIDENCIA: '4',
  INNOMINADO: '5',
  TARJETA_DIPLOMATICA: '6',
  OTRO: '9',
};

export interface DatosGDatRec {
  tercero: Pick<
    Tercero,
    'tipoDocumento' | 'numeroDocumento' | 'dvRuc' | 'razonSocial' | 'direccion' | 'ciudad' | 'departamento' | 'telefono' | 'email'
  >;
}

// gDatRec -- datos del receptor (Manual Tecnico SIFEN v150, E4/E7 segun
// version). Si el receptor tiene RUC (es contribuyente), va por dRucRec; si
// no, por iTipIDRec/dNumIDRec.
export function buildGDatRec(parent: XmlNode, datos: DatosGDatRec): void {
  const esContribuyente = datos.tercero.tipoDocumento === 'RUC';

  const gDatRec = parent
    .ele('gDatRec')
    .ele('iNatRec')
    .txt(esContribuyente ? '1' : '2')
    .up()
    .ele('dDesNatRec')
    .txt(esContribuyente ? 'Contribuyente' : 'No contribuyente')
    .up()
    // B2B (1) si es contribuyente, B2C (2) si no -- simplificacion: no
    // distingue B2G (gobierno) ni B2F (exterior), que requeririan marcar el
    // tercero como tal explicitamente (no modelado hoy).
    .ele('iTiOpe')
    .txt(esContribuyente ? '1' : '2')
    .up()
    .ele('dDesTiOpe')
    .txt(esContribuyente ? 'B2B' : 'B2C')
    .up()
    .ele('cPaisRec')
    .txt('PRY')
    .up()
    .ele('dDesPaisRe')
    .txt('Paraguay')
    .up();

  if (esContribuyente) {
    gDatRec
      .ele('dRucRec')
      .txt(datos.tercero.numeroDocumento)
      .up()
      .ele('dDVRec')
      .txt(datos.tercero.dvRuc ?? '')
      .up();
  } else {
    const iTipIDRec = ITIPIDREC_POR_TIPO[datos.tercero.tipoDocumento] ?? '9';
    gDatRec
      .ele('iTipIDRec')
      .txt(iTipIDRec)
      .up()
      .ele('dNumIDRec')
      .txt(datos.tercero.numeroDocumento)
      .up();
  }

  gDatRec.ele('dNomRec').txt(datos.tercero.razonSocial).up();

  if (datos.tercero.direccion) gDatRec.ele('dDirRec').txt(datos.tercero.direccion).up();
  if (datos.tercero.telefono) gDatRec.ele('dTelRec').txt(datos.tercero.telefono).up();
  if (datos.tercero.email) gDatRec.ele('dEmailRec').txt(datos.tercero.email).up();

  gDatRec.up();
}
