import * as forge from 'node-forge';

export interface CertificadoExtraido {
  privateKeyPem: string;
  certPem: string;
  certDerBase64: string; // certificado en DER/base64, usado dentro de KeyInfo/X509Certificate
  subjectCn: string;
  numeroSerie: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
}

// Extrae la clave privada y el certificado de un .p12/.pfx -- se usa tanto
// al subir el certificado (para guardar la metadata de solo lectura) como
// al firmar cada Documento Electronico (con la clave ya descifrada en
// memoria, nunca persistida en texto plano).
export function extraerCertificado(p12Buffer: Buffer, password: string): CertificadoExtraido {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString('binary')));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag?.key) {
    throw new Error('El archivo .p12 no contiene una clave privada legible (contraseña incorrecta o formato inválido)');
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) {
    throw new Error('El archivo .p12 no contiene un certificado legible');
  }

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  const certPem = forge.pki.certificateToPem(certBag.cert);
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes();
  const certDerBase64 = forge.util.encode64(certDer);

  const subjectCn = certBag.cert.subject.getField('CN')?.value ?? certBag.cert.subject.attributes.map((a) => a.value).join(', ');

  return {
    privateKeyPem,
    certPem,
    certDerBase64,
    subjectCn,
    numeroSerie: certBag.cert.serialNumber,
    fechaEmision: certBag.cert.validity.notBefore,
    fechaVencimiento: certBag.cert.validity.notAfter,
  };
}
