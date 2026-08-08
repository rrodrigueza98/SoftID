import { NaturalezaCuenta, TipoCuentaContable } from '@prisma/client';

export interface CuentaDefault {
  codigo: string;
  nombre: string;
  tipo: TipoCuentaContable;
  naturaleza: NaturalezaCuenta;
  imputable: boolean;
}

// Plan de Cuentas estandar -- transcripto tal cual del modelo oficial de
// Estados Financieros de la DNIT (hoja "Balance Gral -Estado Resultado" de
// la Plantilla Modelo, la misma que usa la obligacion 948/Marangatu), para
// que el Estado de Variacion del Patrimonio Neto que pide la RG 49/26
// (reservas, resultados acumulados) salga de estas cuentas sin remapear
// nada. Se omiten a proposito las lineas de ajuste por inflacion y de
// ejercicios anteriores (5-10-/5-20- en el original): son de uso muy raro
// en una PyME y el propio modelo tiene el codigo "5-20-" duplicado para dos
// conceptos distintos (ajuste de ejercicios anteriores e impuesto a la
// renta) -- Impuesto a la Renta se re-numero a "5-30-" para no chocar.
export const PLAN_CUENTAS_DEFAULT: CuentaDefault[] = [
  // ── ACTIVO ──────────────────────────────────────────────────────────
  { codigo: '1-', nombre: 'ACTIVO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-', nombre: 'ACTIVO CORRIENTE', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-01-', nombre: 'DISPONIBILIDADES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-01-01', nombre: 'CAJA', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-01-02', nombre: 'RECAUDACIONES A DEPOSITAR', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-01-03', nombre: 'BANCOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-01-04', nombre: 'OTROS VALORES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-02-', nombre: 'INVERSIONES TEMPORARIAS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-02-01', nombre: 'VALORES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-', nombre: 'CREDITOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-03-01', nombre: 'CLIENTES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-10', nombre: 'MENOS: PREVISION PARA INCOBRABLES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-11', nombre: 'DEUDORES VARIOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-12', nombre: 'DOCUMENTOS / CUENTAS A COBRAR A DIRECTORES Y FUNCIONARIOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-13', nombre: 'INTERESES A VENCER', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-03-14', nombre: 'TARJETAS DE CREDITOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-10-', nombre: 'INVENTARIOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-10-01', nombre: 'MERCADERIAS - PRODUCTOS TERMINADOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-10-02', nombre: 'PRODUCTOS EN PROCESO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-10-03', nombre: 'MATERIAS PRIMAS - MATERIALES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-10-04', nombre: 'MENOS: PREVISION POR OBSOLESCENCIA', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-15-', nombre: 'ANTICIPOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-15-01', nombre: 'IMPORTACIONES EN CURSO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-15-02', nombre: 'PROVEEDORES (ANTICIPOS)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-01-20-', nombre: 'OTROS ACTIVOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-01-20-01', nombre: 'GASTOS NO DEVENGADOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  // No forma parte de la transcripcion oficial (el modelo no lo desglosa),
  // se agrega para el asiento automatico de Compras (ver mapeo-contable.ts).
  { codigo: '1-01-20-02', nombre: 'IVA CREDITO FISCAL', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-', nombre: 'ACTIVO NO CORRIENTE', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-02-01-', nombre: 'CREDITOS (NO CORRIENTE)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-02-01-01', nombre: 'FONDOS CON DESTINO ESPECIAL', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-01-02', nombre: 'DOCUMENTOS / CUENTAS A COBRAR DIRECTORES Y FUNCIONARIOS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-01-03', nombre: 'DOCUMENTOS POR COBRAR', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-01-04', nombre: 'DEUDORES VARIOS (NO CORRIENTE)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-01-05', nombre: 'CREDITOS EN GESTION DE COBRO MOROSOS O SIMILARES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-01-06', nombre: 'MENOS: PREVISIONES PARA INCOBRABLES (NO CORRIENTE)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-10-', nombre: 'PROPIEDAD, PLANTA Y EQUIPO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-02-10-01', nombre: 'BIENES EN OPERACIÓN', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-10-02', nombre: 'DEPRECIACION ACUMULADA', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-10-03', nombre: 'BIENES FUERA DE OPERACIÓN', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-20-', nombre: 'ACTIVOS INTANGIBLES', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: false },
  { codigo: '1-02-20-01', nombre: 'LICENCIAS DE MANUFACTURAS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-20-02', nombre: 'MARCAS', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-20-03', nombre: 'GASTOS DE DESARROLLO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '1-02-20-04', nombre: 'AMORTIZACION ACUMULADA', tipo: 'ACTIVO', naturaleza: 'DEUDORA', imputable: true },

  // ── PASIVO ──────────────────────────────────────────────────────────
  { codigo: '2-', nombre: 'PASIVO Y PATRIMONIO NETO', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-', nombre: 'PASIVO CORRIENTE', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-01-', nombre: 'CUENTAS A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-01-01', nombre: 'PROVEEDORES LOCALES', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-01-02', nombre: 'PROVEEDORES DEL EXTERIOR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-01-03', nombre: 'INTERESES A VENCER (PASIVO)', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-01-04', nombre: 'ACREEDORES VARIOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-05-', nombre: 'PRESTAMOS FINANCIEROS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-05-01', nombre: 'SOBREGIROS EN CUENTA CORRIENTE', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-05-02', nombre: 'DOCUMENTOS A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-05-03', nombre: 'PORCIÓN CIRCULANTE DE PRÉSTAMOS A LARGO PLAZO', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-05-04', nombre: 'INTERESES A DEVENGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-', nombre: 'PROVISIONES', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-10-01', nombre: 'IMPUESTO A LA RENTA A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-02', nombre: 'IVA A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-03', nombre: 'RETENCIONES DE IMPUESTOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-04', nombre: 'PARA PAGO DE PLANES DE BENEFICIOS PARA EMPLEADOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-05', nombre: 'APORTES Y RETENCIONES A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-10-06', nombre: 'GASTOS ACUMULADOS A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-20-', nombre: 'OTROS PASIVOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-20-01', nombre: 'PRESTAMOS DE TERCEROS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-20-02', nombre: 'ANTICIPO DE CLIENTES', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-20-03', nombre: 'DIVIDENDOS A PAGAR', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-40-', nombre: 'GANANCIAS DIFERIDAS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-01-40-01', nombre: 'INGRESOS NO REALIZADOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-01-40-02', nombre: 'COSTOS Y GASTOS APLICABLES A LOS INGRESOS NO REALIZADOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-02-', nombre: 'PASIVO NO CORRIENTE', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-02-01-', nombre: 'PRESTAMOS FINANCIEROS (NO CORRIENTE)', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-02-01-01', nombre: 'PRESTAMOS EN BANCOS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-02-05-', nombre: 'PREVISIONES (NO CORRIENTE)', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-02-05-01', nombre: 'PREVISION PARA INDEMNIZACION', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-02-05-02', nombre: 'OTRAS CONTINGENCIAS', tipo: 'PASIVO', naturaleza: 'ACREEDORA', imputable: true },

  // ── PATRIMONIO NETO ─────────────────────────────────────────────────
  { codigo: '2-03-', nombre: 'PATRIMONIO NETO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-03-01-', nombre: 'CAPITAL', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-03-01-01', nombre: 'CAPITAL SUSCRIPTO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-01-02', nombre: 'CAPITAL A INTEGRAR', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-01-03', nombre: 'CAPITAL REALIZADO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-02-', nombre: 'RESERVAS', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-03-02-01', nombre: 'RESERVA LEGAL', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-02-02', nombre: 'RESERVA FACULTATIVA', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-02-03', nombre: 'RESERVA DE REVALUO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-03-', nombre: 'RESULTADOS', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '2-03-03-01', nombre: 'RESULTADOS ACUMULADOS', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '2-03-03-02', nombre: 'RESULTADO DEL EJERCICIO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', imputable: true },

  // ── ESTADO DE RESULTADO ─────────────────────────────────────────────
  { codigo: '3-01-', nombre: 'VENTA SECTOR PUBLICO', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '3-02-', nombre: 'VENTA SECTOR PRIVADO', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '4-01-', nombre: 'COSTO DE MERCADERIA (PRODUCTOS O SERVICIOS VENDIDOS)', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '3-10-', nombre: 'MAS OTROS INGRESOS', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: false },
  { codigo: '3-10-01-', nombre: 'INTERESES GANADOS', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '3-10-02-', nombre: 'OTROS INGRESOS', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '4-11-', nombre: 'GASTOS OPERACIONALES', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '4-12-', nombre: 'GASTOS DE VENTAS', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '4-13-', nombre: 'GASTOS DE ADMINISTRACION', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '4-20-', nombre: 'OTROS GASTOS', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '3-20-01-', nombre: 'GASTOS FINANCIEROS', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '3-30-01-', nombre: 'GANANCIAS EXTRAORDINARIAS', tipo: 'INGRESO', naturaleza: 'ACREEDORA', imputable: true },
  { codigo: '4-30-', nombre: 'PERDIDAS EXTRAORDINARIAS', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
  { codigo: '5-30-', nombre: 'IMPUESTO A LA RENTA', tipo: 'EGRESO', naturaleza: 'DEUDORA', imputable: true },
];

// Deriva el codigo del padre de una cuenta a partir de su propio codigo
// jerarquico (ej "1-01-01-01" -> "1-01-01-", "1-01-" -> "1-"). Devuelve
// null para las cuentas raiz (un solo segmento, ej "1-").
export function codigoPadre(codigo: string): string | null {
  const sinGuionFinal = codigo.endsWith('-') ? codigo.slice(0, -1) : codigo;
  const idx = sinGuionFinal.lastIndexOf('-');
  if (idx === -1) return null;
  return sinGuionFinal.slice(0, idx + 1);
}
