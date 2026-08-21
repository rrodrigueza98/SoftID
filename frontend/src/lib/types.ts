// Tipos que reflejan los enums y formas de datos del backend (prisma/schema.prisma).
// No se importan directo del backend porque son proyectos npm separados.

export type RolTipo = 'ADMIN' | 'OPERADOR';

// Secciones operativas restringibles por usuario (ver Usuario.modulosPermitidos).
export type Modulo = 'VENTAS' | 'COMPRAS' | 'INVENTARIO' | 'CONTABILIDAD';

// Pantallas puntuales dentro de cada modulo (ver Usuario.pantallasPermitidas).
export type Pantalla =
  | 'PUNTO_DE_VENTA'
  | 'FACTURACION'
  | 'COMPROBANTES_EMITIDOS'
  | 'CLIENTES'
  | 'CUENTAS_CORRIENTES'
  | 'PROVEEDORES'
  | 'COMPROBANTES_COMPRA'
  | 'PRODUCTOS'
  | 'STOCK'
  | 'CONTABILIDAD'
  | 'BANCOS'
  | 'FORMULARIO_120';

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
  // Vacio = sin restriccion (opera en cualquier punto de expedicion). Solo
  // tiene efecto para usuarios OPERADOR.
  puntosExpedicionPermitidos: string[];
  // Vacio = sin restriccion adicional dentro de los modulos permitidos.
  // Solo tiene efecto para usuarios OPERADOR.
  pantallasPermitidas: Pantalla[];
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
  telefono?: string | null;
  email?: string | null;
  esCasaMatriz: boolean;
  activo: boolean;
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

export interface FacturaVencida {
  id: string;
  numero: string;
  tipoDocumento: TipoDocumentoElectronico;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldoPendiente: number;
  diasVencido: number;
  cliente: { id: string; razonSocial: string; numeroDocumento: string };
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
  documentoElectronico?: DocumentoElectronico | null;
}

export type EstadoDocumentoElectronico =
  | 'BORRADOR'
  | 'PENDIENTE_ENVIO'
  | 'ENVIADO'
  | 'APROBADO'
  | 'APROBADO_CON_OBSERVACION'
  | 'RECHAZADO'
  | 'CANCELADO'
  | 'INUTILIZADO';

export interface DocumentoElectronico {
  id: string;
  comprobanteId: string;
  cdc: string;
  codigoSeguridad: string;
  estado: EstadoDocumentoElectronico;
  protocoloAutorizacion?: string | null;
  motivoRechazo?: string | null;
  qrUrl?: string | null;
  fechaFirma?: string | null;
  fechaEnvio?: string | null;
  fechaProceso?: string | null;
}

export type AmbienteSifen = 'TEST' | 'PRODUCCION';

export interface CertificadoSifenMetadata {
  ambiente: AmbienteSifen;
  subjectCn?: string | null;
  numeroSerie?: string | null;
  fechaEmisionCert?: string | null;
  fechaVencimiento?: string | null;
  tieneCsc: boolean;
  activo: boolean;
  updatedAt: string;
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
  cuentaBancariaId?: string | null;
  aplicaciones?: ReciboAplicacion[];
}

export type RegimenTributario = 'IRE_GENERAL' | 'IRE_SIMPLE' | 'IRE_RESIMPLE';

export interface Empresa {
  id: string;
  ruc: string;
  dvRuc: string;
  razonSocial: string;
  nombreFantasia?: string | null;
  tipoContribuyente: TipoContribuyente;
  regimenTributario?: RegimenTributario | null;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string | null;
  email?: string | null;
  // Clasificador de Actividades Economicas de SET (gActEco de SIFEN) --
  // obligatorio en la practica para emitir Documentos Electronicos.
  actividadEconomicaCodigo?: string | null;
  actividadEconomicaDescripcion?: string | null;
  // Data URI (base64) que carga el superadmin al crear la empresa -- se usa
  // en el encabezado de comprobantes y recibos impresos.
  logoUrl?: string | null;
  proximoNumeroRecibo: number;
  fechaCierreContable?: string | null;
}

export type TipoCuentaContable = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'EGRESO';
export type NaturalezaCuenta = 'DEUDORA' | 'ACREEDORA';
export type OrigenAsiento = 'MANUAL' | 'VENTA' | 'COBRO' | 'COMPRA' | 'PAGO';

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

export interface GrupoResultadoFila {
  cuentaId: string;
  codigo: string;
  nombre: string;
  monto: number;
}

export interface GrupoResultado {
  label: string;
  filas: GrupoResultadoFila[];
  total: number;
}

export interface EstadoResultados {
  desde: string;
  hasta: string;
  ventas: GrupoResultado;
  costoVentas: GrupoResultado;
  utilidadBruta: number;
  gastosOperacionales: GrupoResultado;
  gastosVentas: GrupoResultado;
  gastosAdministracion: GrupoResultado;
  utilidadOperativa: number;
  otrosIngresos: GrupoResultado;
  otrosGastos: GrupoResultado;
  gastosFinancieros: GrupoResultado;
  gananciasExtraordinarias: GrupoResultado;
  perdidasExtraordinarias: GrupoResultado;
  utilidadAntesImpuesto: number;
  impuestoRenta: GrupoResultado;
  utilidadNeta: number;
}

export interface GrupoBalanceFila {
  cuentaId: string;
  codigo: string;
  nombre: string;
  saldo: number;
}

export interface GrupoBalance {
  filas: GrupoBalanceFila[];
  total: number;
}

export interface EstadoSituacionFinanciera {
  fechaCorte: string;
  activoCorriente: GrupoBalance;
  activoNoCorriente: GrupoBalance;
  totalActivo: number;
  pasivoCorriente: GrupoBalance;
  pasivoNoCorriente: GrupoBalance;
  totalPasivo: number;
  patrimonio: GrupoBalance;
  resultadoDelEjercicio: number;
  totalPatrimonio: number;
  totalPasivoYPatrimonio: number;
  diferencia: number;
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

export type TipoCuentaBancaria = 'CUENTA_CORRIENTE' | 'CAJA_AHORRO';
export type TipoMovimientoBancario = 'DEBITO' | 'CREDITO';

export interface CuentaBancaria {
  id: string;
  empresaId: string;
  banco: string;
  nombre: string;
  numeroCuenta: string;
  tipoCuenta: TipoCuentaBancaria;
  moneda: string;
  cuentaContableId: string;
  cuentaContable?: Pick<CuentaContable, 'codigo' | 'nombre'>;
  saldoInicial: string;
  fechaSaldoInicial: string;
  activo: boolean;
}

export interface MovimientoBancario {
  id: string;
  cuentaBancariaId: string;
  fecha: string;
  concepto: string;
  tipo: TipoMovimientoBancario;
  monto: string;
  referencia?: string | null;
  conciliado: boolean;
  fechaConciliacion?: string | null;
}

export interface LineaExtracto {
  fecha: string;
  concepto: string;
  tipo: TipoMovimientoBancario;
  monto: number;
  referencia?: string;
}

export interface MatchExtracto {
  movimiento: MovimientoBancario;
  linea: LineaExtracto;
  diferenciaDias: number;
}

export interface ImportarExtractoResultado {
  matches: MatchExtracto[];
  sinCoincidencia: LineaExtracto[];
  errores: { fila: number; mensaje: string }[];
}

export interface ConciliacionBancaria {
  id: string;
  cuentaBancariaId: string;
  fechaCorte: string;
  saldoLibros: string;
  saldoExtracto: string;
  diferencia: string;
  observacion?: string | null;
  createdAt: string;
}

export interface OrdenPagoAplicacion {
  id: string;
  ordenPagoId: string;
  compraId: string;
  montoAplicado: string;
  compra?: Compra;
}

export interface OrdenPago {
  id: string;
  empresaId: string;
  empresa?: Empresa;
  proveedorId: string;
  proveedor?: Tercero;
  numero: string;
  fecha: string;
  monto: string;
  formaPago: FormaPago;
  observacion?: string | null;
  cuentaBancariaId?: string | null;
  aplicaciones?: OrdenPagoAplicacion[];
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
  atribucionCredito: AtribucionCreditoF120;
}

export type AtribucionCreditoF120 = 'DIRECTA_GRAVADA' | 'INDISTINTA' | 'VINCULADA_EXONERADA';

export type TipoRetencionIva = 'IVA' | 'PERCEPCION_IVA';

export interface RetencionIva {
  id: string;
  empresaId: string;
  tipo: TipoRetencionIva;
  fecha: string;
  periodoTributario: string;
  agenteRetentorRuc: string;
  agenteRetentorNombre: string;
  numeroComprobanteRetencion?: string | null;
  monto: string;
  comprobanteId?: string | null;
  observacion?: string | null;
  createdAt: string;
}

export type TipoDeclaracionF120 = 'ORIGINAL' | 'RECTIFICATIVA';
export type EstadoDeclaracionF120 = 'GENERADA' | 'ANULADA';

interface RubroMontoIva {
  monto: number;
  iva: number;
}

export interface DetalleF120 {
  rubro1: {
    a: RubroMontoIva;
    b: RubroMontoIva;
    c: RubroMontoIva;
    d: { monto: number };
    e: { monto: number };
    f: { monto: number };
    g: { monto: number };
    h: RubroMontoIva;
    i: RubroMontoIva;
    j: RubroMontoIva;
    k: { monto: number };
    totalMontoColI: number;
    totalIvaDebito5: number;
    totalIvaDebito10: number;
  };
  rubro2: { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number; i: number };
  rubro3: {
    a: { monto5: number; monto10: number; iva: number };
    b: { monto5: number; monto10: number; iva: number };
    c: number;
    d: number;
    e: { monto5: number; monto10: number; iva: number };
    f: number;
  };
  rubro6: { a: RubroMontoIva; b: RubroMontoIva; f: number; g: number; cd: number };
}

export interface DeclaracionF120 {
  id: string;
  empresaId: string;
  empresa?: Empresa;
  periodoTributario: string;
  tipoDeclaracion: TipoDeclaracionF120;
  numeroOrdenRectificada?: number | null;
  estado: EstadoDeclaracionF120;
  ivaDebito: string;
  ivaCredito: string;
  saldoTecnicoFavorAnterior: string;
  saldoTecnicoFavorContrib: string;
  saldoTecnicoRemitidoFisco: string;
  saldoTecnicoFavorTrasladar: string;
  saldoTecnicoFavorFisco: string;
  ivaCreditoExportacionUsado: string;
  deduccionDiscapacidad: string;
  impuestoDeterminado: string;
  saldoFinancieroFavorAnterior: string;
  retencionesComputables: string;
  percepcionesComputables: string;
  multa: string;
  subtotalFavorContribuyente: string;
  subtotalFavorFisco: string;
  saldoFinancieroFavorContrib: string;
  saldoAPagarFisco: string;
  detalleJson: DetalleF120;
  generadaEn?: string | null;
  generadaPorUsuarioId?: string | null;
  createdAt: string;
  updatedAt: string;
}
