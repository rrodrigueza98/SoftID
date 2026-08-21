import { createHash } from 'crypto';
import { fechaHoraSifen } from '../xml/groups/xml-node';

export interface DatosQr {
  cdc: string;
  fechaEmision: Date;
  rucReceptor: string;
  totalGeneral: number;
  totalIva: number;
  cantidadItems: number;
  digestValueDe: string; // DigestValue de la Referencia 1 (el propio DE), en base64
  csc: string; // Codigo de Seguridad del Contribuyente (SET), en claro solo en memoria al momento de firmar
  idCsc: string;
}

const QR_BASE_TEST = 'https://ekuatia.set.gov.py/consultas-test/qr';
const QR_BASE_PRODUCCION = 'https://ekuatia.set.gov.py/consultas/qr';

// Arma la URL del QR del KUDE (Manual Tecnico SIFEN v150, Anexo "Generacion
// del Codigo QR"): parametros + un hash SHA-256 de toda la cadena de
// parametros concatenada con el CSC, para que SET pueda validar que el QR
// no fue alterado sin conocer el CSC.
//
// dFeEmiDE y DigestValue van en HEXADECIMAL (la representacion en texto de
// cada string, byte a byte) -- no como texto plano URL-encodeado. Se
// confirmo 2026-08-21 decodificando byte a byte un DE real ya generado
// para esta empresa: su dFeEmiDE="323032362d30382d32305431353a31373a3331"
// decodifica a "2026-08-20T15:17:31" (el mismo valor, en formato
// fecHhmmss) y su DigestValue="447447505867..." decodifica al DigestValue
// real de su Signature. Sin esto, SIFEN rechazaba con "Cadena de
// caracteres correspondiente al codigo QR no es coincidente con el archivo
// XML" -- el resto de los parametros (Id, dRucRec, dTotGralOpe, dTotIVA,
// cItems, IdCSC) van en texto plano, sin hex.
function aHex(texto: string): string {
  return Buffer.from(texto, 'utf8').toString('hex');
}

export function buildQrUrl(datos: DatosQr, produccion: boolean): string {
  const base = produccion ? QR_BASE_PRODUCCION : QR_BASE_TEST;

  const params = new URLSearchParams({
    nVersion: '150',
    Id: datos.cdc,
    dFeEmiDE: aHex(fechaHoraSifen(datos.fechaEmision)),
    dRucRec: datos.rucReceptor,
    dTotGralOpe: datos.totalGeneral.toFixed(2),
    dTotIVA: datos.totalIva.toFixed(2),
    cItems: String(datos.cantidadItems),
    DigestValue: aHex(datos.digestValueDe),
    IdCSC: datos.idCsc,
  });

  const cHashQR = createHash('sha256').update(params.toString() + datos.csc, 'utf8').digest('hex');
  params.set('cHashQR', cHashQR);

  return `${base}?${params.toString()}`;
}
