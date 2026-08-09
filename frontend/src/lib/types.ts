// Tipos que reflejan los enums y formas de datos del backend (prisma/schema.prisma).
// No se importan directo del backend porque son proyectos npm separados.

export type RolTipo = 'ADMIN' | 'OPERADOR';

// Secciones operativas restringibles por usuario (ver Usuario.modulosPermitidos).
export type Modulo = 'VENTAS' | 'COMPRAS' | 'INVENTARIO' | 'CONTABILIDAD';

export interface Rol {
  id: string;
  empresaId: string;
  nombre: string;
  tipo: RolTipo;
}

export interface Usuario {
  id: string;
  empresaId: string;
  rolId: string;
  nombre: string;
  email: string;
  activo: boolean;
  esSuperAdmin: boolean;
  // Vacio = sin restriccion (accede a todo lo que su rol permita). Solo
  // tiene efecto para usuarios OPERADOR.
  modulosPermitidos: Modulo[];
  rol: Rol;
}

export type TipoTercero = 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';

export type TipoContribuyente = 'FISICA' | 'JURIDICA';

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

export type CondicionCredito = 'PLAZO' | 'CUOTA';

export type MotivoEmisionNotaRemision =
  | 'TRASLADO_POR_VENTA'
  | 'TRASLADO_POR_CONSIGNACION'
  | 'EXPORTACION'
  | 'TRASLADO_POR_COMPRA'
  | 'IMPORTACION'
  | 'TRASLADO_POR_DEVOLUCION'
  | 'TRASLADO_ENTRE_LOCALES'
  | 'TRASLADO_POR_TRANSFORMACION'
  | 'TRASLADO_POR_REPARACION'
  | 'TRASLADO_POR_EMISOR_MOVIL'
  | 'EXHIBICION_O_DEMOSTRACION'
  | 'PARTICIPACION_EN_FERIAS'
  | 'TRASLADO_DE_ENCOMIENDA'
  | 'DECOMISO'
  | 'OTRO';

export type ResponsableEmisionNotaRemision =
  | 'EMISOR_FACTURA'
  | 'POSEEDOR_FACTURA_Y_BIENES'
  | 'EMPRESA_TRANSPORTISTA'
  | 'DESPACHANTE_ADUANAS'
  | 'AGENTE_TRANSPORTE';

export type TipoTransporte = 'PROPIO' | 'TERCERO';

export type ModalidadTransporte = 'TERRESTRE' | 'FLUVIAL' | 'AEREO' | 'MULTIMODAL';

export type ResponsableFlete = 'EMISOR_FACTURA' | 'RECEPTOR_FACTURA' | 'TERCERO' | 'AGENTE_INTERMEDIARIO' | 'TRANSPORTE_PROPIO';

export type TipoIdentificacionVehiculo = 'NUMERO_IDENTIFICACION' | 'MATRICULA';

export type NaturalezaTransportista = 'CONTRIBUYENTE' | 'NO_CONTRIBUYENTE';

export interface DatosTransporteRemision {
  motivoEmision: MotivoEmisionNotaRemision;
  motivoEmisionOtro?: string | null;
  responsableEmision: ResponsableEmisionNotaRemision;
  kmEstimados?: number | null;
  fechaEmisionFacturaFutura?: string | null;
  tipoTransporte: TipoTransporte;
  modalidadTransporte: ModalidadTransporte;
  responsableFlete: ResponsableFlete;
  fechaInicioTraslado: string;
  fechaFinTraslado: string;
  direccionSalida: string;
  numeroCasaSalida: string;
  ciudadSalida: string;
  departamentoSalida: string;
  direccionEntrega: string;
  numeroCasaEntrega: string;
  ciudadEntrega: string;
  departamentoEntrega: string;
  tipoVehiculo: string;
  marcaVehiculo: string;
  tipoIdentificacionVehiculo: TipoIdentificacionVehiculo;
  numeroIdentificacionVehiculo?: string | null;
  numeroMatriculaVehiculo?: string | null;
  numeroVuelo?: string | null;
  naturalezaTransportista: NaturalezaTransportista;
  nombreTransportista: string;
  rucTransportista?: string | null;
  dvRucTransportista?: string | null;
  tipoDocIdentidadTransportista?: TipoDocumentoIdentidad | null;
  numeroDocIdentidadTransportista?: string | null;
  numeroDocIdentidadChofer: string;
  nombreChofer: string;
}

export type NaturalezaVendedorAutofactura = 'NO_CONTRIBUYENTE' | 'EXTRANJERO';

export interface DatosVendedorAutofactura {
  naturalezaVendedor: NaturalezaVendedorAutofactura;
  tipoDocIdentidadVendedor: TipoDocumentoIdentidad;
  numeroDocIdentidadVendedor: string;
  nombreVendedor: string;
  direccionVendedor: string;
  numeroCasaVendedor: string;
  ciudadVendedor: string;
  departamentoVendedor: string;
  direccionTransaccion: string;
  ciudadTransaccion: string;
  departamentoTransaccion: string;
}

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
  tipoContribuyente?: TipoContribuyente | null;
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
  esElectronico: boolean;
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
  condicionCredito?: CondicionCredito | null;
  plazoCredito?: string | null;
  cantidadCuotas?: number | null;
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
  datosTransporteRemision?: DatosTransporteRemision | null;
  datosVendedorAutofactura?: DatosVendedorAutofactura | null;
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

export type RegimenTributario = 'IRE_GENERAL' | 'IRE_SIMPLE' | 'IRE_RESIT';

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

export type TipoCuentaContable = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'EGRESO';
export type NaturalezaCuenta = 'DEUDORA' | 'ACREEDORA';
export type OrigenAsiento = 'MANUAL' | 'VENTA' | 'COBRO' | 'COMPRA';

export interface CuentaContable {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuentaContable;
  naturaleza: NaturalezaCuenta;
  imputable: boolean;
  cuentaPadreId?: string | null;
  activo: boolean;
}

export type RolCuenta =
  | 'CAJA'
  | 'BANCO'
  | 'CLIENTES'
  | 'VENTAS'
  | 'IVA_DEBITO'
  | 'COSTO_VENTA'
  | 'INVENTARIO'
  | 'PROVEEDORES'
  | 'IVA_CREDITO';
export type MapeoContable = Partial<Record<RolCuenta, string>>;

export interface AsientoContableDetalle {
  id: string;
  asientoId: string;
  cuentaId: string;
  cuenta?: CuentaContable;
  debe: string;
  haber: string;
  glosa?: string | null;
}

export interface AsientoContable {
  id: string;
  empresaId: string;
  numero: number;
  fecha: string;
  concepto: string;
  origen: OrigenAsiento;
  comprobanteId?: string | null;
  reciboId?: string | null;
  detalles: AsientoContableDetalle[];
}

export interface LibroMayorMovimiento {
  asientoId: string;
  numero: number;
  fecha: string;
  concepto: string;
  glosa?: string | null;
  debe: number;
  haber: number;
  saldo: number;
}

export interface LibroMayor {
  cuenta: CuentaContable;
  movimientos: LibroMayorMovimiento[];
}

export interface BalanceSumasSaldosFila {
  cuentaId: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuentaContable;
  debe: number;
  haber: number;
  saldo: number;
}

export interface BalanceSumasSaldos {
  filas: BalanceSumasSaldosFila[];
  totales: { debe: number; haber: number };
}

export interface PanelVentasFilaFecha {
  fecha: string;
  cantidad: number;
  monto: number;
}

export interface PanelVentasFilaProducto {
  productoId: string;
  descripcion: string;
  cantidad: number;
  monto: number;
}

export interface PanelVentas {
  totalVentas: number;
  montoTotal: number;
  ticketPromedio: number;
  porcentajeCredito: number;
  porFecha: PanelVentasFilaFecha[];
  porProducto: PanelVentasFilaProducto[];
}

export interface PanelComprasFilaFecha {
  fecha: string;
  cantidad: number;
  monto: number;
}

export interface PanelComprasFilaProveedor {
  proveedorId: string;
  razonSocial: string;
  cantidad: number;
  monto: number;
}

export interface PanelCompras {
  totalCompras: number;
  montoTotal: number;
  ticketPromedio: number;
  porcentajeCredito: number;
  porFecha: PanelComprasFilaFecha[];
  porProveedor: PanelComprasFilaProveedor[];
}

export interface Compra {
  id: string;
  empresaId: string;
  proveedorId: string;
  proveedor?: Tercero;
  numeroComprobante: string;
  timbradoProveedor?: string | null;
  fechaEmision: string;
  concepto: string;
  cuentaContableId: string;
  cuentaContable?: CuentaContable;
  condicionCompra: CondicionVenta;
  formaPago?: FormaPago | null;
  montoExenta: string;
  montoGravada10: string;
  montoGravada5: string;
  iva10: string;
  iva5: string;
  total: string;
  observacion?: string | null;
  estado: 'BORRADOR' | 'EMITIDO' | 'ANULADO';
}
