import { randomInt } from 'crypto';
import { TipoContribuyente, TipoDocumentoElectronico, TipoEmisionDE } from '@prisma/client';
import { calcularDigitoVerificador } from './cdc.checkdigit';

// iTiDE -- Tabla "Tipo de Documento Electronico" del Manual Tecnico SIFEN
// v150. COMPROBANTE_RETENCION_ELECTRONICO (08) queda fuera de alcance de
// este modulo a proposito (ver plan de implementacion).
const TIPO_DE_A_ITIDE: Partial<Record<TipoDocumentoElectronico, string>> = {
  FACTURA_ELECTRONICA: '01',
  AUTOFACTURA_ELECTRONICA: '04',
  NOTA_CREDITO_ELECTRONICA: '05',
  NOTA_DEBITO_ELECTRONICA: '06',
  NOTA_REMISION_ELECTRONICA: '07',
};

const TIPO_CONTRIBUYENTE_A_ITIPCONT: Record<TipoContribuyente, string> = {
  FISICA: '1',
  JURIDICA: '2',
};

const TIPO_EMISION_A_ITIPEMI: Record<TipoEmisionDE, string> = {
  NORMAL: '1',
  CONTINGENCIA: '2',
};

function pad(value: string | number, length: number): string {
  return String(value).padStart(length, '0');
}

// Codigo de seguridad: 9 digitos aleatorios (campo D002 del CDC, Manual
// Tecnico SIFEN v150) -- se genera una vez por DE y se reutiliza tal cual en
// el propio XML (campo dCodSeg de gCamGen), asi que se devuelve por
// separado ademas de formar parte del CDC.
function generarCodigoSeguridad(): string {
  return pad(randomInt(0, 1_000_000_000), 9);
}

export interface DatosParaCdc {
  tipoDocumento: TipoDocumentoElectronico;
  numero: string; // ya viene con 7 digitos (Comprobante.numero)
  fechaEmision: Date;
  rucEmisor: string; // sin DV
  dvRucEmisor: string;
  tipoContribuyenteEmisor: TipoContribuyente;
  codigoEstablecimiento: string; // 3 digitos
  codigoPuntoExpedicion: string; // 3 digitos
  tipoEmision?: TipoEmisionDE;
}

export interface CdcGenerado {
  cdc: string; // 44 caracteres
  codigoSeguridad: string; // 9 digitos, tal cual va en el XML (dCodSeg)
}

export function buildCdc(datos: DatosParaCdc): CdcGenerado {
  const iTiDE = TIPO_DE_A_ITIDE[datos.tipoDocumento];
  if (!iTiDE) {
    throw new Error(`buildCdc: tipoDocumento ${datos.tipoDocumento} no tiene mapeo iTiDE (fuera de alcance del modulo SIFEN)`);
  }

  const anio = datos.fechaEmision.getUTCFullYear();
  const mes = pad(datos.fechaEmision.getUTCMonth() + 1, 2);
  const dia = pad(datos.fechaEmision.getUTCDate(), 2);
  const fecha = `${anio}${mes}${dia}`;

  const tipoEmision = datos.tipoEmision ?? TipoEmisionDE.NORMAL;
  const codigoSeguridad = generarCodigoSeguridad();

  const base =
    iTiDE +
    pad(datos.rucEmisor, 8) +
    datos.dvRucEmisor +
    pad(datos.codigoEstablecimiento, 3) +
    pad(datos.codigoPuntoExpedicion, 3) +
    pad(datos.numero, 7) +
    TIPO_CONTRIBUYENTE_A_ITIPCONT[datos.tipoContribuyenteEmisor] +
    fecha +
    TIPO_EMISION_A_ITIPEMI[tipoEmision] +
    codigoSeguridad;

  if (base.length !== 43) {
    throw new Error(`buildCdc: la base del CDC deberia tener 43 digitos, tiene ${base.length} ("${base}")`);
  }

  const dv = calcularDigitoVerificador(base);
  return { cdc: base + String(dv), codigoSeguridad };
}
