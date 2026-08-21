import { TipoContribuyente, TipoDocumentoElectronico, TipoEmisionDE } from '@prisma/client';

// Catalogos cerrados del Manual Tecnico SIFEN v150 -- cada campo codificado
// "iXxx" va acompanado de un campo de texto "dDesXxx" con la descripcion
// oficial de ese codigo. Centralizados aca para no repetir el texto en cada
// builder de grupo.

export const ITIDE_POR_TIPO: Partial<Record<TipoDocumentoElectronico, string>> = {
  FACTURA_ELECTRONICA: '1',
  AUTOFACTURA_ELECTRONICA: '4',
  NOTA_CREDITO_ELECTRONICA: '5',
  NOTA_DEBITO_ELECTRONICA: '6',
  NOTA_REMISION_ELECTRONICA: '7',
};

export const DESC_TIDE_POR_TIPO: Partial<Record<TipoDocumentoElectronico, string>> = {
  FACTURA_ELECTRONICA: 'Factura electrónica',
  AUTOFACTURA_ELECTRONICA: 'Autofactura electrónica',
  NOTA_CREDITO_ELECTRONICA: 'Nota de crédito electrónica',
  NOTA_DEBITO_ELECTRONICA: 'Nota de débito electrónica',
  NOTA_REMISION_ELECTRONICA: 'Nota de remisión electrónica',
};

export const ITIPCONT_POR_TIPO: Record<TipoContribuyente, string> = {
  FISICA: '1',
  JURIDICA: '2',
};

export const ITIPEMI_POR_TIPO: Record<TipoEmisionDE, string> = {
  NORMAL: '1',
  CONTINGENCIA: '2',
};

export const DESC_TIPEMI_POR_TIPO: Record<TipoEmisionDE, string> = {
  NORMAL: 'Normal',
  CONTINGENCIA: 'Contingencia',
};

// Varios enums de este proyecto (MotivoEmisionNotaRemision,
// ResponsableEmisionNotaRemision, TipoTransporte, ModalidadTransporte,
// ResponsableFlete, TipoIdentificacionVehiculo, NaturalezaTransportista,
// NaturalezaVendedorAutofactura...) se declararon a proposito en el mismo
// orden que la tabla numerada del Manual Tecnico SIFEN v150 (ver los
// comentarios "E5xx"/"E9xx" en prisma/schema.prisma) -- el codigo SIFEN de
// cada valor es simplemente su posicion (1-based) dentro del enum. Este
// helper evita mantener un mapa manual por cada uno, con el riesgo de
// transcripcion que eso implica.
export function codigoPorPosicion<T extends Record<string, string>>(enumObj: T, valor: T[keyof T]): string {
  const claves = Object.keys(enumObj);
  const posicion = claves.indexOf(valor as string);
  if (posicion === -1) {
    throw new Error(`codigoPorPosicion: valor "${valor}" no encontrado en el enum`);
  }
  return String(posicion + 1);
}

// Tabla de Departamentos de SIFEN -- confirmada 2026-08-21 contra el XSD
// oficial (ekuatia.set.gov.py/sifen/xsd/Departamentos_v141.xsd). cDepEmi
// solo acepta uno de estos 20 codigos; "0" (el placeholder anterior) es
// invalido y SIFEN lo rechaza (error real recibido: "El valor 0 del
// elemento: cDepEmi es invalido"). Establecimiento.departamento es texto
// libre, se normaliza a mayusculas sin acentos antes de buscar.
const CODIGO_DEPARTAMENTO: Record<string, string> = {
  CAPITAL: '1',
  ASUNCION: '1',
  CONCEPCION: '2',
  'SAN PEDRO': '3',
  CORDILLERA: '4',
  GUAIRA: '5',
  CAAGUAZU: '6',
  CAAZAPA: '7',
  ITAPUA: '8',
  MISIONES: '9',
  PARAGUARI: '10',
  'ALTO PARANA': '11',
  CENTRAL: '12',
  NEEMBUCU: '13',
  AMAMBAY: '14',
  'PTE. HAYES': '15',
  'PRESIDENTE HAYES': '15',
  BOQUERON: '16',
  'ALTO PARAGUAY': '17',
  CANINDEYU: '18',
  CHACO: '19',
  'NUEVA ASUNCION': '20',
};

function normalizarNombreGeografico(nombre: string): string {
  return nombre
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // saca acentos (CONCEPCIÓN -> CONCEPCION)
}

export function codigoDepartamento(nombreDepartamento: string): string {
  const codigo = CODIGO_DEPARTAMENTO[normalizarNombreGeografico(nombreDepartamento)];
  if (!codigo) {
    throw new Error(
      `codigoDepartamento: "${nombreDepartamento}" no coincide con ningun departamento de la Tabla de Departamentos SIFEN`,
    );
  }
  return codigo;
}
