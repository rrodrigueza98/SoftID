import { create } from 'xmlbuilder2';
import { fechaHoraSifen } from '../xml/groups/xml-node';

export interface DatosEventoCancelacion {
  cdc: string;
  motivo: string;
}

// Arma el XML del Evento de Cancelacion (Manual Tecnico SIFEN v150, Anexo
// "Eventos del Documento Electronico") -- se firma igual que un DE (misma
// funcion firmarXmlDe de signing/xml.signer.ts, pasando tagRaiz='rEve' ya
// que el elemento con el Id a referenciar es <rEve>, no <rEventoDE>).
// VERIFICAR la estructura exacta contra el manual -- ver plan de
// implementacion, "Cosas a verificar".
export function buildXmlEventoCancelacion(datos: DatosEventoCancelacion): string {
  const eventoId = `EVT-${datos.cdc}`;

  // xmlns:xsi/xsi:schemaLocation por el mismo motivo que en xml-builder.ts
  // (ver ese comentario) -- el nombre exacto del schema de eventos
  // ("siRecepEvento_v150.xsd") no esta confirmado contra una fuente
  // oficial, se infiere por simetria con "siRecepDE_v150.xsd" (nombre del
  // WSDL es "eventos/evento.wsdl", ver sifen.endpoints.ts) -- VERIFICAR
  // cuando se pruebe el flujo de cancelacion contra SIFEN real.
  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('rEventoDE', {
    xmlns: 'http://ekuatia.set.gov.py/sifen/xsd',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation': 'http://ekuatia.set.gov.py/sifen/xsd siRecepEvento_v150.xsd',
  });

  doc.ele('dId').txt('1').up();

  const gGroupTiEvt = doc.ele('gGroupTiEvt');
  const rEve = gGroupTiEvt.ele('rEve', { Id: eventoId });

  rEve.ele('dFecFirma').txt(fechaHoraSifen(new Date())).up();
  rEve.ele('dVerFor').txt('150').up();

  const gGroupGesEve = rEve.ele('gGroupGesEve');
  gGroupGesEve
    .ele('gCanEve')
    .ele('Id')
    .txt(datos.cdc)
    .up()
    .ele('mOtEve')
    .txt(datos.motivo)
    .up()
    .up();

  gGroupGesEve.up();
  rEve.up();
  gGroupTiEvt.up();
  doc.up();

  return doc.end({ prettyPrint: false });
}
