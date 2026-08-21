import { SignedXml } from 'xml-crypto';

export interface DatosFirmante {
  privateKeyPem: string;
  certPem: string;
}

const C14N_EXC = 'http://www.w3.org/2001/10/xml-exc-c14n#';
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
    canonicalizationAlgorithm: C14N_EXC,
  });

  signedXml.addReference({
    xpath: `//*[local-name(.)='${tagRaiz}']`,
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', C14N_EXC],
    digestAlgorithm: SHA256,
  });

  signedXml.computeSignature(xmlSinFirmar, {
    location: { reference: `//*[local-name(.)='${tagRaiz}']`, action: 'after' },
  });

  return signedXml.getSignedXml();
}
