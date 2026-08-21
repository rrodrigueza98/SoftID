import { create } from 'xmlbuilder2';

export interface DatosEventoCancelacion {
  cdc: string;
  motivo: string;
}

// Arma el XML del Evento de Cancelacion (Manual Tecnico SIFEN v150, Anexo
// "Eventos del Documento Electronico") -- se firma igual que un DE (misma
// funcion firmarXmlDe de signing/xades.signer.ts, ya que el perfil de firma
// XAdES-BES es el mismo para eventos). VERIFICAR la estructura exacta contra
// el manual -- ver plan de implementacion, "Cosas a verificar".
export function buildXmlEventoCancelacion(datos: DatosEventoCancelacion): string {
  const eventoId = `EVT-${datos.cdc}`;

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('rEventoDE', {
    xmlns: 'http://ekuatia.set.gov.py/sifen/xsd',
  });

  doc.ele('dId').txt('1').up();

  const gGroupTiEvt = doc.ele('gGroupTiEvt');
  const rEve = gGroupTiEvt.ele('rEve', { Id: eventoId });

  rEve.ele('dFecFirma').txt(new Date().toISOString()).up();
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
