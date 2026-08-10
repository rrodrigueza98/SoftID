// "Roles" contables que usan los asientos automaticos (venta, cobro). Cada
// rol apunta a una cuenta imputable concreta del Plan de Cuentas de la
// empresa -- se guarda en Empresa.mapeoContable como { [rol]: cuentaId }.
export const CUENTA_ROL = {
  CAJA: 'CAJA',
  BANCO: 'BANCO',
  CLIENTES: 'CLIENTES',
  VENTAS: 'VENTAS',
  IVA_DEBITO: 'IVA_DEBITO',
  COSTO_VENTA: 'COSTO_VENTA',
  INVENTARIO: 'INVENTARIO',
  PROVEEDORES: 'PROVEEDORES',
  IVA_CREDITO: 'IVA_CREDITO',
} as const;

export type RolCuenta = keyof typeof CUENTA_ROL;

export const ROL_LABEL: Record<RolCuenta, string> = {
  CAJA: 'Caja (ventas/compras al contado en efectivo)',
  BANCO: 'Banco (ventas/compras al contado por transferencia/tarjeta/etc.)',
  CLIENTES: 'Clientes (ventas a crédito, cuentas por cobrar)',
  VENTAS: 'Ventas (ingreso neto de IVA)',
  IVA_DEBITO: 'IVA Débito Fiscal (IVA a pagar por ventas)',
  COSTO_VENTA: 'Costo de Mercadería Vendida',
  INVENTARIO: 'Inventario / Mercaderías',
  PROVEEDORES: 'Proveedores (compras a crédito, cuentas por pagar)',
  IVA_CREDITO: 'IVA Crédito Fiscal (IVA a favor por compras)',
};

// Sugerencia por defecto una vez sembrado el Plan de Cuentas estandar --
// el usuario puede pisarla despues desde la pantalla de configuracion.
export const CODIGO_SUGERIDO_POR_ROL: Record<RolCuenta, string> = {
  CAJA: '1-01-01-01',
  BANCO: '1-01-01-03',
  CLIENTES: '1-01-03-01',
  VENTAS: '3-02-',
  IVA_DEBITO: '2-01-10-02',
  COSTO_VENTA: '4-01-',
  INVENTARIO: '1-01-10-01',
  PROVEEDORES: '2-01-01-01',
  IVA_CREDITO: '1-01-20-02',
};

export type MapeoContable = Partial<Record<RolCuenta, string>>;

// Formas de pago que se tratan como "banco" (movimiento no fisico) para
// decidir Caja vs Banco en el asiento automatico de una venta al contado.
const FORMAS_PAGO_BANCARIAS = new Set([
  'TRANSFERENCIA',
  'TARJETA_CREDITO',
  'TARJETA_DEBITO',
  'TARJETA_EMPRESARIAL',
  'BILLETERA_ELECTRONICA',
  'CHEQUE',
  'GIRO',
  'PAGO_BANCARIO',
  'PAGO_MOVIL',
  'PAGO_ELECTRONICO',
  'VALOR_FISCAL',
  'VALOR_COMERCIAL',
]);

export function esFormaPagoBancaria(formaPago: string | undefined | null): boolean {
  return !!formaPago && FORMAS_PAGO_BANCARIAS.has(formaPago);
}

// Clasificacion de cuentas ACTIVO/PASIVO para el Estado de Situacion
// Financiera (NIIF para PYMES, Seccion 4: corriente vs no corriente). Se
// deriva del prefijo de codigo del Plan de Cuentas estandar de la DNIT
// (1-01-/2-01- = corriente, 1-02-/2-02- = no corriente) en vez de un campo
// aparte, para que tambien funcione con sub-cuentas custom que el usuario
// cargue siguiendo esa misma numeracion jerarquica. PATRIMONIO no se separa
// por plazo (no aplica esa distincion).
export type GrupoBalance = 'ACTIVO_CORRIENTE' | 'ACTIVO_NO_CORRIENTE' | 'PASIVO_CORRIENTE' | 'PASIVO_NO_CORRIENTE' | 'PATRIMONIO';

export function clasificarBalance(codigo: string, tipo: string): GrupoBalance {
  if (tipo === 'ACTIVO') return codigo.startsWith('1-02') ? 'ACTIVO_NO_CORRIENTE' : 'ACTIVO_CORRIENTE';
  if (tipo === 'PASIVO') return codigo.startsWith('2-02') ? 'PASIVO_NO_CORRIENTE' : 'PASIVO_CORRIENTE';
  return 'PATRIMONIO';
}

// Clasificacion de cuentas INGRESO/EGRESO para el Estado de Resultados por
// funcion (NIIF para PYMES, Seccion 5). Mismo criterio: prefijo de codigo
// del plan estandar, con fallback a "Otros" para cuentas custom que no
// sigan esa numeracion, asi ninguna cuenta queda afuera del estado.
export type GrupoResultado =
  | 'VENTAS'
  | 'COSTO_VENTAS'
  | 'OTROS_INGRESOS'
  | 'GASTOS_OPERACIONALES'
  | 'GASTOS_VENTAS'
  | 'GASTOS_ADMINISTRACION'
  | 'OTROS_GASTOS'
  | 'GASTOS_FINANCIEROS'
  | 'GANANCIAS_EXTRAORDINARIAS'
  | 'PERDIDAS_EXTRAORDINARIAS'
  | 'IMPUESTO_RENTA';

export function clasificarResultado(codigo: string, tipo: string): GrupoResultado {
  if (codigo.startsWith('3-01') || codigo.startsWith('3-02')) return 'VENTAS';
  if (codigo.startsWith('4-01')) return 'COSTO_VENTAS';
  if (codigo.startsWith('3-10')) return 'OTROS_INGRESOS';
  if (codigo.startsWith('4-11')) return 'GASTOS_OPERACIONALES';
  if (codigo.startsWith('4-12')) return 'GASTOS_VENTAS';
  if (codigo.startsWith('4-13')) return 'GASTOS_ADMINISTRACION';
  if (codigo.startsWith('4-20')) return 'OTROS_GASTOS';
  if (codigo.startsWith('3-20')) return 'GASTOS_FINANCIEROS';
  if (codigo.startsWith('3-30')) return 'GANANCIAS_EXTRAORDINARIAS';
  if (codigo.startsWith('4-30')) return 'PERDIDAS_EXTRAORDINARIAS';
  if (codigo.startsWith('5-')) return 'IMPUESTO_RENTA';
  return tipo === 'INGRESO' ? 'OTROS_INGRESOS' : 'OTROS_GASTOS';
}
