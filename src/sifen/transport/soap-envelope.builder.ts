// El DE/Evento firmado ya es un documento XML completo con su propio
// prologo "<?xml version=...?>" (lo agrega xmlbuilder2 en buildXmlDe). Ese
// prologo solo puede aparecer al principio de un documento -- se saca antes
// de embeberlo como contenido de <xDE>.
function sinProlog(xml: string): string {
  return xml.replace(/^<\?xml[^>]*\?>\s*/, '');
}

// Envuelve el XML del DE firmado en el sobre SOAP que espera el web service
// sincrono de SIFEN (rEnviDe). Estructura verificada el 2026-08-21 contra
// una implementacion de referencia real (TIPS-SA/facturacionelectronicapy-
// setapi) despues de que la primera prueba contra el ambiente real de SET
// devolviera "XML Mal Formado" -- dos diferencias clave respecto a la
// version anterior: (1) el sobre SOAP es version 1.2
// (http://www.w3.org/2003/05/soap-envelope), no 1.1 -- coincide ademas con
// el namespace que la propia SIFEN usa en sus respuestas; (2) el DE
// firmado va envuelto en un elemento <xDE>, NO insertado directo como hijo
// de <rEnviDe> (error real encontrado, la causa mas probable del rechazo).
export function buildSoapEnvelopeRecepcionDe(xmlDeFirmado: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">` +
    `<env:Header/>` +
    `<env:Body><rEnviDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">` +
    `<dId>1</dId>` +
    `<xDE>${sinProlog(xmlDeFirmado)}</xDE>` +
    `</rEnviDe></env:Body>` +
    `</env:Envelope>`
  );
}

export function buildSoapEnvelopeEvento(xmlEventoFirmado: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">` +
    `<env:Header/>` +
    `<env:Body><rEnviEventoDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">` +
    `<dId>1</dId>` +
    `<xDE>${sinProlog(xmlEventoFirmado)}</xDE>` +
    `</rEnviEventoDe></env:Body>` +
    `</env:Envelope>`
  );
}
