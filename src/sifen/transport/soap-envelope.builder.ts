// Envuelve el XML del DE firmado en el sobre SOAP que espera el web service
// sincrono de SIFEN (rEnviDe). VERIFICAR el nombre exacto del elemento raiz
// y del namespace contra el WSDL vigente -- ver plan de implementacion.
export function buildSoapEnvelopeRecepcionDe(xmlDeFirmado: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><rEnviDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">` +
    `<dId>1</dId>` +
    xmlDeFirmado +
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
    xmlEventoFirmado +
    `</rEnviEventoDe></soap:Body>` +
    `</soap:Envelope>`
  );
}
