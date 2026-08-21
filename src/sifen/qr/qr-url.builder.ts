import { createHash } from 'crypto';

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
// no fue alterado sin conocer el CSC. VERIFICAR el orden exacto de
// parametros y el algoritmo de armado del hash contra el manual -- ver plan
// de implementacion, "Cosas a verificar".
export function buildQrUrl(datos: DatosQr, produccion: boolean): string {
  const base = produccion ? QR_BASE_PRODUCCION : QR_BASE_TEST;

  const params = new URLSearchParams({
    nVersion: '150',
    Id: datos.cdc,
    dFeEmiDE: datos.fechaEmision.toISOString(),
    dRucRec: datos.rucReceptor,
    dTotGralOpe: datos.totalGeneral.toFixed(2),
    dTotIVA: datos.totalIva.toFixed(2),
    cItems: String(datos.cantidadItems),
    DigestValue: datos.digestValueDe,
    IdCSC: datos.idCsc,
  });

  const cHashQR = createHash('sha256').update(params.toString() + datos.csc, 'utf8').digest('hex');
  params.set('cHashQR', cHashQR);

  return `${base}?${params.toString()}`;
}
