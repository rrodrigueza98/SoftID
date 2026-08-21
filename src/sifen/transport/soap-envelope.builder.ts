// El DE/Evento firmado ya es un documento XML completo con su propio
// prologo "<?xml version=...?>" (lo agrega xmlbuilder2 en buildXmlDe). Ese
// prologo solo puede aparecer al principio de un documento -- insertarlo
// tal cual DENTRO de otro elemento (el sobre SOAP) produce XML invalido, y
// es probablemente la causa real del "XML Mal Formado" que devuelve SIFEN.
// Se saca antes de embeberlo como contenido de <rEnviDe>/<rEnviEventoDe>.
function sinProlog(xml: string): string {
  return xml.replace(/^<\?xml[^>]*\?>\s*/, '');
}

// Envuelve el XML del DE firmado en el sobre SOAP que espera el web service
// sincrono de SIFEN (rEnviDe). VERIFICAR el nombre exacto del elemento raiz
// y del namespace contra el WSDL vigente -- ver plan de implementacion.
export function buildSoapEnvelopeRecepcionDe(xmlDeFirmado: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><rEnviDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">` +
    `<dId>1</dId>` +
    sinProlog(xmlDeFirmado) +
    `</rEnviDe></soap:Body>` +
    `</soap:Envelope>`
  );
}

export function buildSoapEnvelopeEvento(xmlEventoFirmado: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><rEnviEventoDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">` +
    `<dId>1</dId>` +
    sinProlog(xmlEventoFirmado) +
    `</rEnviEventoDe></soap:Body>` +
    `</soap:Envelope>`
  );
}
