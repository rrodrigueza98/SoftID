import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';

export type ResultadoSifen = 'APROBADO' | 'APROBADO_CON_OBSERVACION' | 'RECHAZADO';

export interface RespuestaSifen {
  resultado: ResultadoSifen;
  codigo: string | null;
  mensaje: string | null;
  protocoloAutorizacion: string | null;
  raw: string;
}

function textoDe(doc: Document, xpathExpr: string): string | null {
  try {
    const nodo = xpath.select1(xpathExpr, doc);
    if (!nodo) return null;
    const texto = (nodo as unknown as { textContent?: string }).textContent;
    return texto ? texto.trim() : null;
  } catch {
    return null;
  }
}

// Interpreta la respuesta cruda (SOAP + rRetEnviDe) del web service sincrono
// de SIFEN. VERIFICAR los nombres exactos de los elementos (dCodRes, dMsgRes,
// dProtAut, dEstRes...) contra el Manual Tecnico -- estan armados con el
// mejor conocimiento disponible, no confirmados byte a byte.
//
// La red entre nosotros y SIFEN puede devolver cualquier cosa que no sea el
// XML esperado -- una pagina de error de un balanceador, una respuesta vacia
// si el TLS mutuo fue rechazado, un timeout ya convertido en string vacio,
// etc. Nunca debe explotar por eso: si no se puede parsear, se trata como un
// rechazo con el cuerpo crudo como mensaje, no como una excepcion no
// controlada.
export function parseRespuestaSifen(xmlRespuesta: string): RespuestaSifen {
  if (!xmlRespuesta || !xmlRespuesta.trim().startsWith('<')) {
    return {
      resultado: 'RECHAZADO',
      codigo: null,
      mensaje: `Respuesta de SIFEN no es XML válido: ${xmlRespuesta.slice(0, 300) || '(vacía)'}`,
      protocoloAutorizacion: null,
      raw: xmlRespuesta,
    };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xmlRespuesta, 'text/xml');
  } catch (err) {
    return {
      resultado: 'RECHAZADO',
      codigo: null,
      mensaje: `No se pudo parsear la respuesta de SIFEN: ${err instanceof Error ? err.message : err}`,
      protocoloAutorizacion: null,
      raw: xmlRespuesta,
    };
  }

  const codigo = textoDe(doc, "//*[local-name(.)='dCodRes']");
  const mensaje = textoDe(doc, "//*[local-name(.)='dMsgRes']");
  const estado = textoDe(doc, "//*[local-name(.)='dEstRes']");
  const protocoloAutorizacion = textoDe(doc, "//*[local-name(.)='dProtAut']");

  let resultado: ResultadoSifen = 'RECHAZADO';
  const estadoNormalizado = (estado ?? '').toLowerCase();
  if (estadoNormalizado.includes('aprobado con observ')) {
    resultado = 'APROBADO_CON_OBSERVACION';
  } else if (estadoNormalizado.includes('aprobado')) {
    resultado = 'APROBADO';
  }

  return { resultado, codigo, mensaje, protocoloAutorizacion, raw: xmlRespuesta };
}
