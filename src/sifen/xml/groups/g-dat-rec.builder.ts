import type { Tercero } from '@prisma/client';
import { ITIPCONT_POR_TIPO } from '../catalogos';
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

const DESC_TIPIDREC_POR_TIPO: Partial<Record<Tercero['tipoDocumento'], string>> = {
  CEDULA_PARAGUAYA: 'Cédula paraguaya',
  PASAPORTE: 'Pasaporte',
  CEDULA_EXTRANJERA: 'Cédula extranjera',
  CARNET_RESIDENCIA: 'Carnet de residencia',
  INNOMINADO: 'Innominado',
  TARJETA_DIPLOMATICA: 'Tarjeta diplomática',
  OTRO: 'Otro',
};

export interface DatosGDatRec {
  tercero: Pick<
    Tercero,
    | 'tipoDocumento'
    | 'numeroDocumento'
    | 'dvRuc'
    | 'razonSocial'
    | 'tipoContribuyente'
    | 'direccion'
    | 'ciudad'
    | 'departamento'
    | 'telefono'
    | 'email'
  >;
}

// gDatRec -- datos del receptor. Orden y nombres de campo verificados
// contra DE_v150.xsd (ekuatia.set.gov.py/sifen/xsd/DE_v150.xsd) el
// 2026-08-21: iNatRec, iTiOpe, cPaisRec, dDesPaisRe, iTiContRec, dRucRec,
// dDVRec, iTipIDRec, dDTipIDRec, dNumIDRec, dNomRec, ... -- ojo que NO
// existen campos "dDesNatRec"/"dDesTiOpe" en el schema real (se habian
// incluido antes por error, ya sacados).
export function buildGDatRec(parent: XmlNode, datos: DatosGDatRec): void {
  const esContribuyente = datos.tercero.tipoDocumento === 'RUC';

  const gDatRec = parent
    .ele('gDatRec')
    .ele('iNatRec')
    .txt(esContribuyente ? '1' : '2')
    .up()
    // B2B (1) si es contribuyente, B2C (2) si no -- simplificacion: no
    // distingue B2G (gobierno) ni B2F (exterior), que requeririan marcar el
    // tercero como tal explicitamente (no modelado hoy).
    .ele('iTiOpe')
    .txt(esContribuyente ? '1' : '2')
    .up()
    .ele('cPaisRec')
    .txt('PRY')
    .up()
    .ele('dDesPaisRe')
    .txt('Paraguay')
    .up();

  if (esContribuyente) {
    // iTiContRec resulto obligatorio en la practica (rechazo real: "Es
    // obligatorio informar el tipo de contribuyente receptor") -- clientes
    // dados de alta al vuelo desde el buscador de DNIT antes de este chequeo
    // pueden haber quedado sin este dato, asi que se corta con un error
    // claro en vez de mandar un DE que SIFEN va a rechazar de nuevo.
    if (!datos.tercero.tipoContribuyente) {
      throw new Error(
        `buildGDatRec: falta el tipo de contribuyente de "${datos.tercero.razonSocial}" (RUC ${datos.tercero.numeroDocumento}) -- SIFEN lo exige (iTiContRec). Cargalo en Clientes/Proveedores.`,
      );
    }
    gDatRec.ele('iTiContRec').txt(ITIPCONT_POR_TIPO[datos.tercero.tipoContribuyente]).up();
    gDatRec
      .ele('dRucRec')
      .txt(datos.tercero.numeroDocumento)
      .up()
      .ele('dDVRec')
      .txt(datos.tercero.dvRuc ?? '')
      .up();
  } else {
    const iTipIDRec = ITIPIDREC_POR_TIPO[datos.tercero.tipoDocumento] ?? '9';
    const dDTipIDRec = DESC_TIPIDREC_POR_TIPO[datos.tercero.tipoDocumento] ?? 'Otro';
    gDatRec
      .ele('iTipIDRec')
      .txt(iTipIDRec)
      .up()
      .ele('dDTipIDRec')
      .txt(dDTipIDRec)
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
