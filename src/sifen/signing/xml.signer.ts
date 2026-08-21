import { SignedXml } from 'xml-crypto';

export interface DatosFirmante {
  privateKeyPem: string;
  certPem: string;
}

// C14N inclusivo (no exclusivo) -- confirmado 2026-08-21 contra un DE real
// ya generado para esta misma empresa: su CanonicalizationMethod es
// exactamente este algoritmo. Ese mismo DE de referencia solo lista el
// transform enveloped-signature en su Reference (sin C14N aparte) -- se
// probo replicar eso tambien, pero rompio la verificacion criptografica
// local con xml-crypto (digest mismatch entre firma y verificacion,
// aparentemente porque sin un transform de canonicalizacion explicito la
// serializacion del nodo <DE> despues de enveloped-signature no es estable
// entre el momento de firmar y el de verificar). El documento real
// probablemente sale de una libreria distinta que aplica canonicalizacion
// implicita en su propio paso enveloped-signature; con xml-crypto hace
// falta el segundo transform explicito, y eso SIFEN igual lo acepta (no es
// estricto con la lista de Transforms, solo con que la firma sea valida).
const C14N_INC = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';

// Firma un XML de DE/Evento con XMLDSig enveloped simple (Reference unica
// sobre el elemento con Id, sin capa XAdES-BES). Se habia armado antes un
// XAdES-BES a mano (SignedProperties/QualifyingProperties), pero SIFEN
// respondio "Firma difiere del estandar. [Reference URI]" contra ese XML --
// y facturacionelectronicapy-xmlsign (TIPS-SA), un firmador Node.js de uso
// real y verificado contra SIFEN, tampoco arma XAdES: solo XMLDSig
// enveloped basico, con una sola Reference cuya URI sale por defecto del
// propio atributo Id del nodo referenciado. Se alinea esta implementacion a
// ese patron conocido-bueno en vez de seguir iterando sobre una capa XAdES
// hecha a mano y sin verificar byte a byte.
export function firmarXmlDe(xmlSinFirmar: string, firmante: DatosFirmante, tagRaiz: 'DE' | 'rEve' | 'rRec' = 'DE'): string {
  const signedXml = new SignedXml({
    privateKey: firmante.privateKeyPem,
    publicCert: firmante.certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: C14N_INC,
  });

  signedXml.addReference({
    xpath: `//*[local-name(.)='${tagRaiz}']`,
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', C14N_INC],
    digestAlgorithm: SHA256,
  });

  signedXml.computeSignature(xmlSinFirmar, {
    location: { reference: `//*[local-name(.)='${tagRaiz}']`, action: 'after' },
  });

  return signedXml.getSignedXml();
}
