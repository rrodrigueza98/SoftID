import { createHash } from 'crypto';
import { SignedXml } from 'xml-crypto';

export interface DatosFirmante {
  privateKeyPem: string;
  certPem: string;
  certDerBase64: string; // certificado en DER/base64 (ver p12.util.ts)
}

const DS_NS = 'http://www.w3.org/2000/09/xmldsig#';
const XADES_NS = 'http://uri.etsi.org/01903/v1.3.2#';
const C14N_EXC = 'http://www.w3.org/2001/10/xml-exc-c14n#';
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';

const SIGNED_PROPERTIES_ID = 'xades-signedprops';
const SIGNATURE_ID = 'xades-signature';

// Firma un XML de DE segun el perfil XAdES-BES que exige SIFEN (Manual
// Tecnico SIFEN v150, Anexo "Firma Digital"). xml-crypto (via SignedXml)
// resuelve la firma XMLDSig de base (SignedInfo/SignatureValue/KeyInfo) --
// el bloque xades:QualifyingProperties/xades:SignedProperties que XAdES
// agrega encima no lo soporta ninguna libreria de npm para el perfil de
// SIFEN, asi que se arma a mano en dos pasos:
//
//   1. Se inserta xades:SignedProperties como un nodo REAL (temporal) en el
//      documento antes de firmar, colgado como sibling de <DE> (fuera de su
//      subarbol) -- xml-crypto solo puede referenciar por xpath algo que
//      realmente existe en el arbol, no admite pasar un digest precalculado
//      de un fragmento externo. Fuera de <DE> a proposito: si quedara
//      adentro, formaria parte del contenido que se hashea para la
//      Referencia 1 (el propio <DE>), y dejaria de coincidir al reubicarlo.
//   2. Una vez firmado, se lo reubica (por texto) de sibling de <ds:Signature>
//      a hijo de <ds:Signature> dentro de <ds:Object><xades:QualifyingProperties>.
//      Esto no invalida su digest porque el fragmento declara sus propios
//      namespaces inline (xmlns:xades/xmlns:ds en el propio elemento) y la
//      canonicalizacion exclusiva no arrastra namespaces heredados del
//      contexto -- su forma canonica es la misma este donde este colgado.
//
// ADVERTENCIA: no verificado byte a byte contra un XML firmado de
// referencia de SET -- ver plan de implementacion, "Cosas a verificar".
export function firmarXmlDe(xmlSinFirmar: string, firmante: DatosFirmante): string {
  const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const certDigest = createHash('sha256').update(Buffer.from(firmante.certDerBase64, 'base64')).digest('base64');

  const signedPropertiesXml =
    `<xades:SignedProperties xmlns:xades="${XADES_NS}" xmlns:ds="${DS_NS}" Id="${SIGNED_PROPERTIES_ID}">` +
    `<xades:SignedSignatureProperties>` +
    `<xades:SigningTime>${signingTime}</xades:SigningTime>` +
    `<xades:SigningCertificate><xades:Cert><xades:CertDigest>` +
    `<ds:DigestMethod Algorithm="${SHA256}"/>` +
    `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
    `</xades:CertDigest></xades:Cert></xades:SigningCertificate>` +
    `</xades:SignedSignatureProperties>` +
    `</xades:SignedProperties>`;

  // Paso 1: se cuelga temporalmente FUERA de <DE> (sibling directo bajo
  // <rDE>), no adentro -- si quedara dentro de <DE>, formaria parte del
  // contenido que se hashea para la Referencia 1 (el propio <DE>), y al
  // reubicarlo despues dentro de <ds:Signature> (que ya no cuenta para esa
  // referencia) el digest de <DE> dejaria de coincidir en la verificacion.
  // Puesto afuera de <DE>, nunca contamina esa referencia en ningun momento.
  const xmlConSignedProperties = xmlSinFirmar.replace(/(<\/rDE>)/, `${signedPropertiesXml}$1`);

  const signedXml = new SignedXml({
    privateKey: firmante.privateKeyPem,
    publicCert: firmante.certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: C14N_EXC,
  });

  // Referencia 1: el documento completo (envelope signature sobre <DE>).
  signedXml.addReference({
    xpath: "//*[local-name(.)='DE']",
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', C14N_EXC],
    digestAlgorithm: SHA256,
  });

  // Referencia 2: xades:SignedProperties -- ahora existe como nodo real, asi
  // que xml-crypto calcula su digest de la forma habitual.
  signedXml.addReference({
    xpath: "//*[local-name(.)='SignedProperties']",
    uri: `#${SIGNED_PROPERTIES_ID}`,
    digestAlgorithm: SHA256,
    transforms: [C14N_EXC],
  });

  signedXml.computeSignature(xmlConSignedProperties, {
    prefix: 'ds',
    attrs: { Id: SIGNATURE_ID },
    location: { reference: "//*[local-name(.)='DE']", action: 'append' },
  });

  let signed = signedXml.getSignedXml();

  // NOTA: XAdES-BES pide que la Reference a SignedProperties lleve
  // Type="http://uri.etsi.org/01903#SignedProperties", pero xml-crypto no
  // expone ese atributo via addReference() -- e inyectarlo por texto DESPUES
  // de computeSignature() invalida la SignatureValue (que ya quedo calculada
  // sobre el SignedInfo sin ese atributo). Se omite a proposito: una firma
  // criptograficamente valida sin Type es preferible a una con Type pero
  // rota. Si SIFEN lo exige de forma estricta, la solucion real es construir
  // SignedInfo a mano (sin pasar por SignedXml) para poder incluirlo antes
  // de firmar -- ver plan de implementacion, "Cosas a verificar".

  // Paso 2: se saca xades:SignedProperties de donde quedo (sibling de
  // ds:Signature dentro de DE) y se lo envuelve en ds:Object/QualifyingProperties
  // como hijo de ds:Signature.
  signed = signed.replace(signedPropertiesXml, '');
  const qualifyingProperties =
    `<ds:Object><xades:QualifyingProperties xmlns:xades="${XADES_NS}" Target="#${SIGNATURE_ID}">` +
    signedPropertiesXml +
    `</xades:QualifyingProperties></ds:Object>`;
  signed = signed.replace(/(<ds:Signature[^>]*Id="xades-signature"[^>]*>[\s\S]*?)(<\/ds:Signature>)/, `$1${qualifyingProperties}$2`);

  return signed;
}
