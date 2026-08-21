import { Agent } from 'https';
import { request } from 'https';
import { URL } from 'url';

// SIFEN exige TLS mutuo: el mismo certificado que firma el XML se presenta
// tambien como certificado cliente en el handshake HTTPS. En un principio se
// probo pasarle el .p12 crudo (pfx+passphrase) directo a https.Agent, pero
// el parser de PFX nativo de Node (OpenSSL) rechazo un .p12 de prueba
// valido que node-forge si pudo leer sin problemas ("Unsupported PKCS12 PFX
// data") -- para no depender de esa compatibilidad, se arma el agent con el
// mismo cert/key en PEM que ya extrajo node-forge para firmar el XML (ver
// signing/p12.util.ts), evitando por completo el parser de PFX nativo.
export function buildHttpsAgent(certPem: string, privateKeyPem: string): Agent {
  return new Agent({ cert: certPem, key: privateKeyPem });
}

const TIMEOUT_MS = 20_000;

export async function postSoapEnvelope(url: string, soapXml: string, agent: Agent): Promise<string> {
  const { hostname, pathname, port, protocol } = new URL(url);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        agent,
        hostname,
        port: port || (protocol === 'https:' ? 443 : 80),
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(soapXml, 'utf8'),
          'User-Agent': 'SoftID',
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );

    req.on('timeout', () => req.destroy(new Error(`Timeout de ${TIMEOUT_MS}ms conectando a SIFEN (${url})`)));
    req.on('error', reject);
    req.write(soapXml, 'utf8');
    req.end();
  });
}
