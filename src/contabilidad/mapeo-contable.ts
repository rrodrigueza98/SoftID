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
} as const;

export type RolCuenta = keyof typeof CUENTA_ROL;

export const ROL_LABEL: Record<RolCuenta, string> = {
  CAJA: 'Caja (ventas al contado en efectivo)',
  BANCO: 'Banco (ventas al contado por transferencia/tarjeta/etc.)',
  CLIENTES: 'Clientes (ventas a crédito, cuentas por cobrar)',
  VENTAS: 'Ventas (ingreso neto de IVA)',
  IVA_DEBITO: 'IVA Débito Fiscal (IVA a pagar por ventas)',
  COSTO_VENTA: 'Costo de Mercadería Vendida',
  INVENTARIO: 'Inventario / Mercaderías',
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
