// Tipos que reflejan los enums y formas de datos del backend (prisma/schema.prisma).
// No se importan directo del backend porque son proyectos npm separados.

export type TipoTercero = 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';

export type TipoDocumentoIdentidad =
  | 'RUC'
  | 'CEDULA_PARAGUAYA'
  | 'PASAPORTE'
  | 'CEDULA_EXTRANJERA'
  | 'CARNET_RESIDENCIA'
  | 'INNOMINADO'
  | 'TARJETA_DIPLOMATICA'
  | 'OTRO';

export type AfectacionIVA = 'GRAVADO' | 'EXONERADO' | 'EXENTO' | 'GRAVADO_PARCIAL';

export type TipoMovimientoStock =
  | 'COMPRA'
  | 'VENTA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'TRANSFERENCIA_SALIDA'
  | 'TRANSFERENCIA_ENTRADA'
  | 'DEVOLUCION_COMPRA'
  | 'DEVOLUCION_VENTA'
  | 'INVENTARIO_INICIAL';

export type FormaPago =
  | 'EFECTIVO'
  | 'CHEQUE'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA'
  | 'GIRO'
  | 'BILLETERA_ELECTRONICA'
  | 'TARJETA_EMPRESARIAL'
  | 'VALE'
  | 'RETENCION'
  | 'PAGO_ANTICIPO'
  | 'VALOR_FISCAL'
  | 'VALOR_COMERCIAL'
  | 'COMPENSACION'
  | 'PERMUTA'
  | 'PAGO_BANCARIO'
  | 'PAGO_MOVIL'
  | 'DONACION'
  | 'PROMOCION'
  | 'CONSUMO_INTERNO'
  | 'PAGO_ELECTRONICO'
  | 'OTRO';

export type TipoDocumentoElectronico =
  | 'FACTURA_ELECTRONICA'
  | 'AUTOFACTURA_ELECTRONICA'
  | 'NOTA_CREDITO_ELECTRONICA'
  | 'NOTA_DEBITO_ELECTRONICA'
  | 'NOTA_REMISION_ELECTRONICA'
  | 'COMPROBANTE_RETENCION_ELECTRONICO';

export type MotivoEmisionNotaCD =
  | 'DEVOLUCION_Y_AJUSTE_PRECIOS'
  | 'DEVOLUCION'
  | 'DESCUENTO'
  | 'BONIFICACION'
  | 'CREDITO_INCOBRABLE'
  | 'RECUPERO_DE_COSTO'
  | 'RECUPERO_DE_GASTO'
  | 'AJUSTE_DE_PRECIO';

export type CondicionVenta = 'CONTADO' | 'CREDITO';

export interface CuentaCorriente {
  id: string;
  terceroId: string;
  saldo: string;
  limiteCredito: string | null;
}

export interface Tercero {
  id: string;
  empresaId: string;
  tipo: TipoTercero;
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  dvRuc?: string | null;
  razonSocial: string;
  nombreFantasia?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
  cuentaCorriente?: CuentaCorriente | null;
}

export interface UnidadMedida {
  id: string;
  codigoSifen: string;
  descripcion: string;
}

export interface CategoriaProducto {
  id: string;
  empresaId: string;
  nombre: string;
  categoriaPadreId?: string | null;
}

export interface Producto {
  id: string;
  empresaId: string;
  codigo: string;
  codigoBarra?: string | null;
  descripcion: string;
  categoriaId?: string | null;
  categoria?: CategoriaProducto | null;
  unidadMedidaId: string;
  unidadMedida?: UnidadMedida;
  afectacionIva: AfectacionIVA;
  tasaIva: number;
  precioCosto: string;
  precioVenta: string;
  controlaStock: boolean;
  stockMinimo?: string | null;
  activo: boolean;
}

export interface Deposito {
  id: string;
  empresaId: string;
  establecimientoId?: string | null;
  nombre: string;
  esPrincipal: boolean;
  activo: boolean;
}

export interface Stock {
  id: string;
  productoId: string;
  depositoId: string;
  cantidad: string;
  producto: Producto;
  deposito: Deposito;
}

export interface MovimientoStock {
  id: string;
  productoId: string;
  depositoId: string;
  depositoDestinoId?: string | null;
  tipo: TipoMovimientoStock;
  cantidad: string;
  cantidadAnterior: string;
  cantidadNueva: string;
  fecha: string;
  observacion?: string | null;
  producto: Producto;
  deposito: Deposito;
}

export interface Establecimiento {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  puntosExpedicion?: PuntoExpedicion[];
}

export interface Timbrado {
  id: string;
  puntoExpedicionId: string;
  numeroTimbrado: string;
  tipoDocumento: TipoDocumentoElectronico;
  numeroDesde: number;
  numeroHasta: number;
  proximoNumero: number;
  fechaInicioVigencia: string;
  fechaFinVigencia?: string | null;
  activo: boolean;
  puntoExpedicion?: PuntoExpedicion;
}

export interface PuntoExpedicion {
  id: string;
  establecimientoId: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
  timbrados?: Timbrado[];
  establecimiento?: Establecimiento;
}

export interface MovimientoCuentaCorriente {
  id: string;
  cuentaCorrienteId: string;
  tipo: 'DEBITO' | 'CREDITO';
  monto: string;
  saldoAnterior: string;
  saldoNuevo: string;
  concepto: string;
  fecha: string;
  fechaVencimiento?: string | null;
}

export interface ComprobanteItem {
  id: string;
  productoId?: string | null;
  descripcion: string;
  cantidad: string;
  unidadMedidaId: string;
  unidadMedida?: UnidadMedida;
  precioUnitario: string;
  descuento: string;
  afectacionIva: AfectacionIVA;
  tasaIva: number;
  proporcionGravada?: string | null;
  montoExenta: string;
  montoGravado: string;
  liquidacionIva: string;
  total: string;
}

export interface RentabilidadItem {
  productoId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  totalVenta: number;
  totalCosto: number;
  margen: number;
  margenPorcentual: number;
}

export interface ReporteRentabilidad {
  items: RentabilidadItem[];
  ventaSinCosto: number;
  totales: {
    totalVenta: number;
    totalCosto: number;
    margen: number;
    margenPorcentual: number;
  };
}

export interface Comprobante {
  id: string;
  empresaId: string;
  puntoExpedicionId: string;
  timbradoId: string;
  tipoDocumento: TipoDocumentoElectronico;
  numero: string;
  fechaEmision: string;
  clienteId?: string | null;
  cliente?: Tercero | null;
  proveedorId?: string | null;
  proveedor?: Tercero | null;
  condicionVenta: CondicionVenta;
  comprobanteAsociadoId?: string | null;
  motivoEmision?: MotivoEmisionNotaCD | null;
  observacion?: string | null;
  subtotalExenta: string;
  subtotalGravada10: string;
  subtotalGravada5: string;
  iva10: string;
  iva5: string;
  total: string;
  estado: 'BORRADOR' | 'EMITIDO' | 'ANULADO';
  sesionCajaId?: string | null;
  items: ComprobanteItem[];
  empresa?: Empresa;
  timbrado?: Timbrado;
}

export interface ComprobantePago {
  id: string;
  comprobanteId: string;
  formaPago: FormaPago;
  monto: string;
  banco?: string | null;
  numeroCheque?: string | null;
  fecha: string;
}

export interface UsuarioResumen {
  id: string;
  nombre: string;
}

export interface ResumenPago {
  formaPago: FormaPago;
  total: number;
}

export interface SesionCaja {
  id: string;
  empresaId: string;
  puntoExpedicionId: string;
  usuarioAperturaId: string;
  usuarioCierreId?: string | null;
  usuarioApertura?: UsuarioResumen;
  usuarioCierre?: UsuarioResumen | null;
  montoInicial: string;
  montoFinalDeclarado?: string | null;
  montoFinalCalculado?: string | null;
  diferencia?: string | null;
  estado: 'ABIERTA' | 'CERRADA';
  fechaApertura: string;
  fechaCierre?: string | null;
  observacionCierre?: string | null;
  resumenPagos?: ResumenPago[];
  ventas?: Comprobante[];
}

export interface ReciboAplicacion {
  id: string;
  reciboId: string;
  comprobanteId: string;
  montoAplicado: string;
  comprobante?: Comprobante;
}

export interface Recibo {
  id: string;
  empresaId: string;
  empresa?: Empresa;
  terceroId: string;
  tercero?: Tercero;
  numero: string;
  fecha: string;
  monto: string;
  formaPago: FormaPago;
  observacion?: string | null;
  aplicaciones?: ReciboAplicacion[];
}

export interface Empresa {
  id: string;
  ruc: string;
  dvRuc: string;
  razonSocial: string;
  nombreFantasia?: string | null;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string | null;
  proximoNumeroRecibo: number;
}
