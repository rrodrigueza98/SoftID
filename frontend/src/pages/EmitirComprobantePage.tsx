import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { useAuth } from '../lib/auth-context';
import { formatGs } from '../lib/format';
import { calcularItem, calcularSubtotales } from '../lib/comprobante-calc';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { RucSearchBox, type ResultadoBusquedaRuc } from '../components/RucSearch';
import { FiscalSetupDialog } from './FiscalSetupDialog';
import {
  MOTIVO_REMISION_LABEL,
  RESPONSABLE_EMISION_REMISION_LABEL,
  RESPONSABLE_FLETE_LABEL,
  TIPO_DOCUMENTO_LABEL,
} from './comprobante-labels';
import { ComprobanteVisual, type ComprobanteVisualData } from './ComprobanteVisual';
import type {
  AfectacionIVA,
  CondicionCredito,
  CondicionVenta,
  Comprobante,
  Deposito,
  Empresa,
  Establecimiento,
  FormaPago,
  ModalidadTransporte,
  MotivoEmisionNotaCD,
  MotivoEmisionNotaRemision,
  NaturalezaTransportista,
  NaturalezaVendedorAutofactura,
  PuntoExpedicion,
  Producto,
  ResponsableEmisionNotaRemision,
  ResponsableFlete,
  Tercero,
  TipoDocumentoElectronico,
  TipoDocumentoIdentidad,
  TipoIdentificacionVehiculo,
  TipoTransporte,
  UnidadMedida,
} from '../lib/types';

const CONDICION_IDENTIDAD_LABEL: Record<string, string> = {
  RUC: 'RUC',
  CEDULA_PARAGUAYA: 'C.I.',
  CEDULA_EXTRANJERA: 'C.I. extranjera',
  PASAPORTE: 'Pasaporte',
  CARNET_RESIDENCIA: 'Carnet de residencia',
  TARJETA_DIPLOMATICA: 'Tarjeta diplomática',
  INNOMINADO: 'Consumidor final',
  OTRO: 'Documento',
};

const TIPOS = (
  ['FACTURA_ELECTRONICA', 'NOTA_CREDITO_ELECTRONICA', 'NOTA_DEBITO_ELECTRONICA', 'AUTOFACTURA_ELECTRONICA', 'NOTA_REMISION_ELECTRONICA'] as TipoDocumentoElectronico[]
).map((value) => ({ value, label: TIPO_DOCUMENTO_LABEL[value] }));

const MOTIVOS: { value: MotivoEmisionNotaCD; label: string }[] = [
  { value: 'DEVOLUCION_Y_AJUSTE_PRECIOS', label: 'Devolución y ajuste de precios' },
  { value: 'DEVOLUCION', label: 'Devolución' },
  { value: 'DESCUENTO', label: 'Descuento' },
  { value: 'BONIFICACION', label: 'Bonificación' },
  { value: 'CREDITO_INCOBRABLE', label: 'Crédito incobrable' },
  { value: 'RECUPERO_DE_COSTO', label: 'Recupero de costo' },
  { value: 'RECUPERO_DE_GASTO', label: 'Recupero de gasto' },
  { value: 'AJUSTE_DE_PRECIO', label: 'Ajuste de precio' },
];

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'BILLETERA_ELECTRONICA', label: 'Billetera electrónica' },
  { value: 'OTRO', label: 'Otro' },
];

const TIPO_DOC_TRANSPORTISTA: { value: TipoDocumentoIdentidad; label: string }[] = [
  { value: 'CEDULA_PARAGUAYA', label: 'Cédula paraguaya' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CEDULA_EXTRANJERA', label: 'Cédula extranjera' },
  { value: 'CARNET_RESIDENCIA', label: 'Carnet de residencia' },
];

// SIFEN (E304 iTipIDVen) solo admite estos 4 tipos de documento para el
// vendedor de una Autofactura.
const TIPO_DOC_VENDEDOR = TIPO_DOC_TRANSPORTISTA;

interface DatosRemisionForm {
  motivoEmision: MotivoEmisionNotaRemision;
  motivoEmisionOtro: string;
  responsableEmision: ResponsableEmisionNotaRemision;
  kmEstimados: string;
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
  numeroIdentificacionVehiculo: string;
  numeroMatriculaVehiculo: string;
  numeroVuelo: string;
  naturalezaTransportista: NaturalezaTransportista;
  nombreTransportista: string;
  rucTransportista: string;
  dvRucTransportista: string;
  tipoDocIdentidadTransportista: TipoDocumentoIdentidad | '';
  numeroDocIdentidadTransportista: string;
  numeroDocIdentidadChofer: string;
  nombreChofer: string;
}

function emptyDatosRemision(): DatosRemisionForm {
  return {
    motivoEmision: 'TRASLADO_POR_VENTA',
    motivoEmisionOtro: '',
    responsableEmision: 'EMISOR_FACTURA',
    kmEstimados: '',
    tipoTransporte: 'PROPIO',
    modalidadTransporte: 'TERRESTRE',
    responsableFlete: 'EMISOR_FACTURA',
    fechaInicioTraslado: '',
    fechaFinTraslado: '',
    direccionSalida: '',
    numeroCasaSalida: '',
    ciudadSalida: '',
    departamentoSalida: '',
    direccionEntrega: '',
    numeroCasaEntrega: '',
    ciudadEntrega: '',
    departamentoEntrega: '',
    tipoVehiculo: '',
    marcaVehiculo: '',
    tipoIdentificacionVehiculo: 'MATRICULA',
    numeroIdentificacionVehiculo: '',
    numeroMatriculaVehiculo: '',
    numeroVuelo: '',
    naturalezaTransportista: 'CONTRIBUYENTE',
    nombreTransportista: '',
    rucTransportista: '',
    dvRucTransportista: '',
    tipoDocIdentidadTransportista: '',
    numeroDocIdentidadTransportista: '',
    numeroDocIdentidadChofer: '',
    nombreChofer: '',
  };
}

interface DatosVendedorForm {
  naturalezaVendedor: NaturalezaVendedorAutofactura;
  tipoDocIdentidadVendedor: TipoDocumentoIdentidad | '';
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

function emptyDatosVendedor(): DatosVendedorForm {
  return {
    naturalezaVendedor: 'NO_CONTRIBUYENTE',
    tipoDocIdentidadVendedor: '',
    numeroDocIdentidadVendedor: '',
    nombreVendedor: '',
    direccionVendedor: '',
    numeroCasaVendedor: '',
    ciudadVendedor: '',
    departamentoVendedor: '',
    direccionTransaccion: '',
    ciudadTransaccion: '',
    departamentoTransaccion: '',
  };
}

interface ItemRow {
  key: string;
  productoId: string;
  descripcion: string;
  cantidad: string;
  unidadMedidaId: string;
  precioUnitario: string;
  descuento: string;
  afectacionIva: AfectacionIVA;
  tasaIva: number;
  proporcionGravada: string;
}

function emptyRow(unidadMedidaId = ''): ItemRow {
  return {
    key: crypto.randomUUID(),
    productoId: '',
    descripcion: '',
    cantidad: '1',
    unidadMedidaId,
    precioUnitario: '',
    descuento: '',
    afectacionIva: 'GRAVADO',
    tasaIva: 10,
    proporcionGravada: '',
  };
}

export default function EmitirComprobantePage() {
  const empresaId = useEmpresaId();
  const { esAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fiscalSetupOpen, setFiscalSetupOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [emitido, setEmitido] = useState<{ id: string; numero: string } | null>(null);

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoElectronico>('FACTURA_ELECTRONICA');
  const [timbradoId, setTimbradoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [condicionVenta, setCondicionVenta] = useState<CondicionVenta>('CONTADO');
  const [formaPago, setFormaPago] = useState<FormaPago>('EFECTIVO');
  const [condicionCredito, setCondicionCredito] = useState<CondicionCredito>('PLAZO');
  const [plazoCredito, setPlazoCredito] = useState('');
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [comprobanteAsociadoId, setComprobanteAsociadoId] = useState('');
  const [motivoEmision, setMotivoEmision] = useState<MotivoEmisionNotaCD>('DESCUENTO');
  const [observacion, setObservacion] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [datosRemision, setDatosRemision] = useState<DatosRemisionForm>(emptyDatosRemision());
  const [datosVendedor, setDatosVendedor] = useState<DatosVendedorForm>(emptyDatosVendedor());

  const esAutofactura = tipoDocumento === 'AUTOFACTURA_ELECTRONICA';
  const esNota = tipoDocumento === 'NOTA_CREDITO_ELECTRONICA' || tipoDocumento === 'NOTA_DEBITO_ELECTRONICA';
  const esFactura = tipoDocumento === 'FACTURA_ELECTRONICA';
  const esRemision = tipoDocumento === 'NOTA_REMISION_ELECTRONICA';
  // SIFEN (E600) solo exige "condicion de la operacion" -- y por lo tanto
  // forma de pago o plazo/cuota -- para Factura y Autofactura.
  const requiereCondicionOperacion = esFactura || esAutofactura;

  function reiniciarFormulario() {
    setError(null);
    setPreviewing(false);
    setEmitido(null);
    setTipoDocumento('FACTURA_ELECTRONICA');
    setTimbradoId('');
    setClienteId('');
    setProveedorId('');
    setCondicionVenta('CONTADO');
    setFormaPago('EFECTIVO');
    setCondicionCredito('PLAZO');
    setPlazoCredito('');
    setCantidadCuotas('');
    setDepositoId('');
    setComprobanteAsociadoId('');
    setObservacion('');
    setItems([emptyRow()]);
    setDatosRemision(emptyDatosRemision());
    setDatosVendedor(emptyDatosVendedor());
  }

  // --- catalogos de soporte ---
  const { data: empresa } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => (await api.get<Empresa>(`/empresas/${empresaId}`)).data,
  });

  const { data: establecimientos } = useQuery({
    queryKey: ['establecimientos', empresaId],
    queryFn: async () => (await api.get<Establecimiento[]>('/establecimientos', { params: { empresaId } })).data,
  });
  const establecimiento = establecimientos?.[0];

  const { data: puntosExpedicion } = useQuery({
    queryKey: ['puntos-expedicion', establecimiento?.id],
    queryFn: async () =>
      (await api.get<PuntoExpedicion[]>('/puntos-expedicion', { params: { establecimientoId: establecimiento!.id } })).data,
    enabled: Boolean(establecimiento),
  });
  const puntoExpedicion = puntosExpedicion?.[0];

  const timbradosDisponibles = useMemo(
    () => (puntoExpedicion?.timbrados ?? []).filter((t) => t.activo && t.tipoDocumento === tipoDocumento && t.proximoNumero <= t.numeroHasta),
    [puntoExpedicion, tipoDocumento],
  );

  useEffect(() => {
    setTimbradoId(timbradosDisponibles[0]?.id ?? '');
  }, [timbradosDisponibles]);

  const { data: terceros } = useQuery({
    queryKey: ['terceros-select', empresaId, esAutofactura ? 'PROVEEDOR' : 'CLIENTE'],
    queryFn: async () =>
      (await api.get<Tercero[]>('/terceros', { params: { empresaId, tipo: esAutofactura ? 'PROVEEDOR' : 'CLIENTE' } })).data,
  });

  const [rucDialogOpen, setRucDialogOpen] = useState(false);
  const [creandoTercero, setCreandoTercero] = useState(false);
  const [rucDialogError, setRucDialogError] = useState<string | null>(null);

  // Al elegir un resultado de DNIT: si ya existe un tercero con ese RUC lo
  // seleccionamos directo, si no lo damos de alta en el momento (con lo
  // minimo indispensable) para no cortar el flujo de facturacion -- despues
  // se puede completar el resto de sus datos desde Clientes/Proveedores.
  const elegirClienteDnit = async (r: ResultadoBusquedaRuc) => {
    const existente = terceros?.find((t) => t.numeroDocumento === r.ruc);
    if (existente) {
      esAutofactura ? setProveedorId(existente.id) : setClienteId(existente.id);
      setRucDialogOpen(false);
      return;
    }

    setCreandoTercero(true);
    setRucDialogError(null);
    try {
      const nuevo = (
        await api.post<Tercero>('/terceros', {
          empresaId,
          tipo: esAutofactura ? 'PROVEEDOR' : 'CLIENTE',
          tipoDocumento: 'RUC',
          numeroDocumento: r.ruc,
          dvRuc: r.dv,
          razonSocial: r.razonSocial,
          activo: true,
        })
      ).data;
      await queryClient.invalidateQueries({ queryKey: ['terceros-select', empresaId] });
      esAutofactura ? setProveedorId(nuevo.id) : setClienteId(nuevo.id);
      setRucDialogOpen(false);
    } catch (err) {
      setRucDialogError(apiErrorMessage(err));
    } finally {
      setCreandoTercero(false);
    }
  };

  const { data: productos } = useQuery({
    queryKey: ['productos-select', empresaId],
    queryFn: async () => (await api.get<Producto[]>('/productos', { params: { empresaId } })).data,
  });

  const { data: unidades } = useQuery({
    queryKey: ['unidades-medida'],
    queryFn: async () => (await api.get<UnidadMedida[]>('/unidades-medida')).data,
  });

  const { data: depositos } = useQuery({
    queryKey: ['depositos', empresaId],
    queryFn: async () => (await api.get<Deposito[]>('/depositos', { params: { empresaId } })).data,
    enabled: esFactura,
  });

  const { data: facturasCliente } = useQuery({
    queryKey: ['comprobantes-cliente', clienteId],
    queryFn: async () =>
      (
        await api.get<Comprobante[]>('/comprobantes', {
          params: { empresaId, clienteId, tipoDocumento: 'FACTURA_ELECTRONICA' },
        })
      ).data.filter((c) => c.estado === 'EMITIDO'),
    enabled: esNota && Boolean(clienteId),
  });

  function patchRemision(patch: Partial<DatosRemisionForm>) {
    setDatosRemision((d) => ({ ...d, ...patch }));
  }

  function patchVendedor(patch: Partial<DatosVendedorForm>) {
    setDatosVendedor((d) => ({ ...d, ...patch }));
  }

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function selectProducto(key: string, productoId: string) {
    const producto = productos?.find((p) => p.id === productoId);
    if (!producto) {
      updateRow(key, { productoId });
      return;
    }
    updateRow(key, {
      productoId,
      descripcion: producto.descripcion,
      precioUnitario: producto.precioVenta,
      unidadMedidaId: producto.unidadMedidaId,
      afectacionIva: producto.afectacionIva,
      tasaIva: producto.tasaIva,
    });
  }

  const itemsCalculados = items.map((row) => ({
    row,
    calc: calcularItem({
      cantidad: Number(row.cantidad) || 0,
      precioUnitario: Number(row.precioUnitario) || 0,
      descuento: row.descuento ? Number(row.descuento) : 0,
      afectacionIva: row.afectacionIva,
      tasaIva: row.tasaIva,
      proporcionGravada: row.proporcionGravada ? Number(row.proporcionGravada) : undefined,
    }),
  }));
  const subtotales = calcularSubtotales(itemsCalculados.map((i) => i.calc));

  function datosTransporteRemisionPayload() {
    if (!esRemision) return undefined;
    const d = datosRemision;
    return {
      motivoEmision: d.motivoEmision,
      motivoEmisionOtro: d.motivoEmision === 'OTRO' ? d.motivoEmisionOtro || undefined : undefined,
      responsableEmision: d.responsableEmision,
      kmEstimados: d.kmEstimados ? Number(d.kmEstimados) : undefined,
      tipoTransporte: d.tipoTransporte,
      modalidadTransporte: d.modalidadTransporte,
      responsableFlete: d.responsableFlete,
      fechaInicioTraslado: d.fechaInicioTraslado,
      fechaFinTraslado: d.fechaFinTraslado,
      direccionSalida: d.direccionSalida,
      numeroCasaSalida: d.numeroCasaSalida,
      ciudadSalida: d.ciudadSalida,
      departamentoSalida: d.departamentoSalida,
      direccionEntrega: d.direccionEntrega,
      numeroCasaEntrega: d.numeroCasaEntrega,
      ciudadEntrega: d.ciudadEntrega,
      departamentoEntrega: d.departamentoEntrega,
      tipoVehiculo: d.tipoVehiculo,
      marcaVehiculo: d.marcaVehiculo,
      tipoIdentificacionVehiculo: d.tipoIdentificacionVehiculo,
      numeroIdentificacionVehiculo:
        d.tipoIdentificacionVehiculo === 'NUMERO_IDENTIFICACION' ? d.numeroIdentificacionVehiculo || undefined : undefined,
      numeroMatriculaVehiculo: d.tipoIdentificacionVehiculo === 'MATRICULA' ? d.numeroMatriculaVehiculo || undefined : undefined,
      numeroVuelo: d.modalidadTransporte === 'AEREO' ? d.numeroVuelo || undefined : undefined,
      naturalezaTransportista: d.naturalezaTransportista,
      nombreTransportista: d.nombreTransportista,
      rucTransportista: d.naturalezaTransportista === 'CONTRIBUYENTE' ? d.rucTransportista || undefined : undefined,
      dvRucTransportista: d.naturalezaTransportista === 'CONTRIBUYENTE' ? d.dvRucTransportista || undefined : undefined,
      tipoDocIdentidadTransportista:
        d.naturalezaTransportista === 'NO_CONTRIBUYENTE' ? d.tipoDocIdentidadTransportista || undefined : undefined,
      numeroDocIdentidadTransportista:
        d.naturalezaTransportista === 'NO_CONTRIBUYENTE' ? d.numeroDocIdentidadTransportista || undefined : undefined,
      numeroDocIdentidadChofer: d.numeroDocIdentidadChofer,
      nombreChofer: d.nombreChofer,
    };
  }

  function datosVendedorAutofacturaPayload() {
    if (!esAutofactura) return undefined;
    const d = datosVendedor;
    return {
      naturalezaVendedor: d.naturalezaVendedor,
      tipoDocIdentidadVendedor: d.tipoDocIdentidadVendedor || undefined,
      numeroDocIdentidadVendedor: d.numeroDocIdentidadVendedor,
      nombreVendedor: d.nombreVendedor,
      direccionVendedor: d.direccionVendedor,
      numeroCasaVendedor: d.numeroCasaVendedor,
      ciudadVendedor: d.ciudadVendedor,
      departamentoVendedor: d.departamentoVendedor,
      direccionTransaccion: d.direccionTransaccion,
      ciudadTransaccion: d.ciudadTransaccion,
      departamentoTransaccion: d.departamentoTransaccion,
    };
  }

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<Comprobante>('/comprobantes', {
          empresaId,
          puntoExpedicionId: puntoExpedicion!.id,
          timbradoId,
          tipoDocumento,
          clienteId: esAutofactura ? undefined : clienteId || undefined,
          proveedorId: esAutofactura ? proveedorId || undefined : undefined,
          condicionVenta,
          formaPago: requiereCondicionOperacion && condicionVenta === 'CONTADO' ? formaPago : undefined,
          condicionCredito: requiereCondicionOperacion && condicionVenta === 'CREDITO' ? condicionCredito : undefined,
          plazoCredito:
            requiereCondicionOperacion && condicionVenta === 'CREDITO' && condicionCredito === 'PLAZO'
              ? plazoCredito || undefined
              : undefined,
          cantidadCuotas:
            requiereCondicionOperacion && condicionVenta === 'CREDITO' && condicionCredito === 'CUOTA'
              ? Number(cantidadCuotas)
              : undefined,
          depositoId: esFactura ? depositoId || undefined : undefined,
          comprobanteAsociadoId: esNota ? comprobanteAsociadoId || undefined : undefined,
          motivoEmision: esNota ? motivoEmision : undefined,
          datosTransporteRemision: datosTransporteRemisionPayload(),
          datosVendedorAutofactura: datosVendedorAutofacturaPayload(),
          observacion: observacion || undefined,
          items: items.map((row) => ({
            productoId: row.productoId || undefined,
            descripcion: row.descripcion,
            cantidad: Number(row.cantidad),
            unidadMedidaId: row.unidadMedidaId,
            precioUnitario: Number(row.precioUnitario),
            descuento: row.descuento ? Number(row.descuento) : undefined,
            afectacionIva: row.afectacionIva,
            tasaIva: row.tasaIva,
            proporcionGravada: row.proporcionGravada ? Number(row.proporcionGravada) : undefined,
          })),
        })
      ).data,
    onSuccess: (comprobante) => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      queryClient.invalidateQueries({ queryKey: ['puntos-expedicion'] });
      setEmitido({ id: comprobante.id, numero: comprobante.numero });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const condicionOperacionCompleta =
    !requiereCondicionOperacion ||
    (condicionVenta === 'CONTADO'
      ? Boolean(formaPago)
      : condicionCredito === 'PLAZO'
        ? Boolean(plazoCredito)
        : Boolean(cantidadCuotas) && Number(cantidadCuotas) > 0);

  const datosRemisionCompletos =
    !esRemision ||
    (Boolean(datosRemision.fechaInicioTraslado) &&
      Boolean(datosRemision.fechaFinTraslado) &&
      Boolean(datosRemision.direccionSalida) &&
      Boolean(datosRemision.numeroCasaSalida) &&
      Boolean(datosRemision.ciudadSalida) &&
      Boolean(datosRemision.departamentoSalida) &&
      Boolean(datosRemision.direccionEntrega) &&
      Boolean(datosRemision.numeroCasaEntrega) &&
      Boolean(datosRemision.ciudadEntrega) &&
      Boolean(datosRemision.departamentoEntrega) &&
      Boolean(datosRemision.tipoVehiculo) &&
      Boolean(datosRemision.marcaVehiculo) &&
      (datosRemision.tipoIdentificacionVehiculo === 'MATRICULA'
        ? Boolean(datosRemision.numeroMatriculaVehiculo)
        : Boolean(datosRemision.numeroIdentificacionVehiculo)) &&
      (datosRemision.modalidadTransporte !== 'AEREO' || Boolean(datosRemision.numeroVuelo)) &&
      Boolean(datosRemision.nombreTransportista) &&
      (datosRemision.naturalezaTransportista === 'CONTRIBUYENTE'
        ? Boolean(datosRemision.rucTransportista)
        : Boolean(datosRemision.tipoDocIdentidadTransportista) && Boolean(datosRemision.numeroDocIdentidadTransportista)) &&
      Boolean(datosRemision.numeroDocIdentidadChofer) &&
      Boolean(datosRemision.nombreChofer) &&
      (datosRemision.motivoEmision !== 'OTRO' || Boolean(datosRemision.motivoEmisionOtro)));

  const datosVendedorCompletos =
    !esAutofactura ||
    (Boolean(datosVendedor.tipoDocIdentidadVendedor) &&
      Boolean(datosVendedor.numeroDocIdentidadVendedor) &&
      Boolean(datosVendedor.nombreVendedor) &&
      Boolean(datosVendedor.direccionVendedor) &&
      Boolean(datosVendedor.numeroCasaVendedor) &&
      Boolean(datosVendedor.ciudadVendedor) &&
      Boolean(datosVendedor.departamentoVendedor) &&
      Boolean(datosVendedor.direccionTransaccion) &&
      Boolean(datosVendedor.ciudadTransaccion) &&
      Boolean(datosVendedor.departamentoTransaccion));

  const puedeEmitir =
    Boolean(puntoExpedicion) &&
    Boolean(timbradoId) &&
    (esAutofactura ? Boolean(proveedorId) : Boolean(clienteId)) &&
    condicionOperacionCompleta &&
    datosRemisionCompletos &&
    datosVendedorCompletos &&
    items.every((r) => r.descripcion && r.cantidad && r.precioUnitario && r.unidadMedidaId);

  const timbradoSeleccionado = timbradosDisponibles.find((t) => t.id === timbradoId);
  const receptor = terceros?.find((t) => t.id === (esAutofactura ? proveedorId : clienteId));

  const previewData: ComprobanteVisualData = {
    empresa: empresa ?? null,
    tipoDocumento,
    numeroCompleto:
      establecimiento && puntoExpedicion && timbradoSeleccionado
        ? `${establecimiento.codigo}-${puntoExpedicion.codigo}-${String(timbradoSeleccionado.proximoNumero).padStart(7, '0')}`
        : '(sin timbrado)',
    timbradoNumero: timbradoSeleccionado?.numeroTimbrado,
    timbradoVigenciaDesde: timbradoSeleccionado?.fechaInicioVigencia,
    fechaEmision: new Date().toISOString(),
    receptorLabel: esAutofactura ? 'Proveedor' : 'Cliente',
    receptorNombre: receptor?.razonSocial ?? 'Consumidor final',
    receptorIdentidadLabel: receptor ? CONDICION_IDENTIDAD_LABEL[receptor.tipoDocumento] : undefined,
    receptorNumeroDocumento: receptor?.numeroDocumento,
    receptorDireccion: receptor?.direccion,
    condicionVenta,
    motivoEmisionLabel: esNota ? MOTIVOS.find((m) => m.value === motivoEmision)?.label : undefined,
    items: itemsCalculados.map(({ row, calc }) => ({
      key: row.key,
      descripcion: row.descripcion,
      cantidad: row.cantidad,
      unidad: unidades?.find((u) => u.id === row.unidadMedidaId)?.descripcion,
      precioUnitario: row.precioUnitario || 0,
      ivaLabel: row.afectacionIva === 'GRAVADO' || row.afectacionIva === 'GRAVADO_PARCIAL' ? `${row.tasaIva}%` : row.afectacionIva,
      total: calc.total,
    })),
    subtotalExenta: subtotales.subtotalExenta,
    subtotalGravada5: subtotales.subtotalGravada5,
    subtotalGravada10: subtotales.subtotalGravada10,
    iva5: subtotales.iva5,
    iva10: subtotales.iva10,
    total: subtotales.total,
    esPreview: true,
    datosTransporteRemision: esRemision
      ? {
          ...datosRemision,
          motivoEmisionOtro: datosRemision.motivoEmisionOtro || null,
          kmEstimados: datosRemision.kmEstimados ? Number(datosRemision.kmEstimados) : null,
          fechaEmisionFacturaFutura: null,
          numeroIdentificacionVehiculo: datosRemision.numeroIdentificacionVehiculo || null,
          numeroMatriculaVehiculo: datosRemision.numeroMatriculaVehiculo || null,
          numeroVuelo: datosRemision.numeroVuelo || null,
          rucTransportista: datosRemision.rucTransportista || null,
          dvRucTransportista: datosRemision.dvRucTransportista || null,
          tipoDocIdentidadTransportista: datosRemision.tipoDocIdentidadTransportista || null,
          numeroDocIdentidadTransportista: datosRemision.numeroDocIdentidadTransportista || null,
        }
      : undefined,
    datosVendedorAutofactura: esAutofactura
      ? {
          ...datosVendedor,
          tipoDocIdentidadVendedor: datosVendedor.tipoDocIdentidadVendedor || 'CEDULA_PARAGUAYA',
        }
      : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Facturación</h1>
        <p className="mt-1 text-sm text-ink-500">Cargá los datos, previsualizá y confirmá la emisión.</p>
      </div>

      <Card className="p-5">
        {emitido ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
            <div>
              <p className="font-medium text-ink-900">Comprobante Nº {emitido.numero} emitido</p>
              <p className="mt-1 text-sm text-ink-500">Ya se registró y quedó disponible en Comprobantes emitidos.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reiniciarFormulario}>
                Emitir otro
              </Button>
              <Button variant="secondary" onClick={() => window.open(`/imprimir/comprobantes/${emitido.id}`, '_blank')}>
                Imprimir
              </Button>
              <Link to="/facturacion">
                <Button>Ver comprobantes emitidos</Button>
              </Link>
            </div>
          </div>
        ) : previewing ? (
          <div className="flex flex-col gap-4">
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="max-h-[70vh] overflow-y-auto border border-ink-200">
              <ComprobanteVisual data={previewData} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setPreviewing(false);
                }}
              >
                Volver a editar
              </Button>
              <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? 'Emitiendo…' : 'Confirmar y emitir'}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPreviewing(true);
            }}
            className="flex flex-col gap-4"
          >
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tipo de documento" required>
                <Select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoElectronico)}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Timbrado" required>
                {timbradosDisponibles.length === 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-amber-700">
                      No hay timbrado vigente para {TIPO_DOCUMENTO_LABEL[tipoDocumento]}. Cada tipo de documento necesita el
                      suyo propio.
                    </p>
                    {esAdmin ? (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setFiscalSetupOpen(true)}>
                        Configurar timbrado…
                      </Button>
                    ) : (
                      <p className="text-xs text-ink-500">Pedile a un administrador que lo configure.</p>
                    )}
                  </div>
                ) : (
                  <Select value={timbradoId} onChange={(e) => setTimbradoId(e.target.value)}>
                    {timbradosDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        Nº {t.numeroTimbrado} (próximo: {String(t.proximoNumero).padStart(7, '0')})
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={esAutofactura ? 'Proveedor' : 'Cliente'} required>
                <div className="flex gap-2">
                  <Select
                    value={esAutofactura ? proveedorId : clienteId}
                    onChange={(e) => (esAutofactura ? setProveedorId(e.target.value) : setClienteId(e.target.value))}
                    required
                    className="flex-1"
                  >
                    <option value="" disabled>
                      Elegir…
                    </option>
                    {terceros?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.razonSocial}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRucDialogError(null);
                      setRucDialogOpen(true);
                    }}
                  >
                    Buscar en DNIT
                  </Button>
                </div>
              </FormField>
              <FormField label="Condición de venta">
                <Select value={condicionVenta} onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)}>
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </Select>
              </FormField>
            </div>

            {requiereCondicionOperacion && condicionVenta === 'CONTADO' && (
              <FormField label="Forma de pago" required>
                <Select value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPago)}>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {requiereCondicionOperacion && condicionVenta === 'CREDITO' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Condición del crédito" required>
                  <Select value={condicionCredito} onChange={(e) => setCondicionCredito(e.target.value as CondicionCredito)}>
                    <option value="PLAZO">Plazo</option>
                    <option value="CUOTA">Cuota</option>
                  </Select>
                </FormField>
                {condicionCredito === 'PLAZO' ? (
                  <FormField label="Plazo (ej. 30 días)" required>
                    <Input value={plazoCredito} onChange={(e) => setPlazoCredito(e.target.value)} placeholder="30 días" />
                  </FormField>
                ) : (
                  <FormField label="Cantidad de cuotas" required>
                    <Input
                      type="number"
                      min="1"
                      value={cantidadCuotas}
                      onChange={(e) => setCantidadCuotas(e.target.value)}
                      placeholder="12"
                    />
                  </FormField>
                )}
              </div>
            )}

            {esFactura && (
              <FormField label="Depósito (para descontar stock)">
                <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value)}>
                  <option value="">No afectar stock</option>
                  {depositos?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {esNota && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Factura asociada">
                  <Select value={comprobanteAsociadoId} onChange={(e) => setComprobanteAsociadoId(e.target.value)}>
                    <option value="">Sin asociar</option>
                    {facturasCliente?.map((c) => (
                      <option key={c.id} value={c.id}>
                        Nº {c.numero} — {formatGs(c.total)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Motivo de emisión" required>
                  <Select value={motivoEmision} onChange={(e) => setMotivoEmision(e.target.value as MotivoEmisionNotaCD)}>
                    {MOTIVOS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            )}

            {esAutofactura && (
              <div className="flex flex-col gap-4 rounded-md border border-ink-200 p-4">
                <h3 className="text-sm font-semibold text-ink-800">Datos del vendedor (Autofactura)</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Naturaleza del vendedor" required>
                    <Select
                      value={datosVendedor.naturalezaVendedor}
                      onChange={(e) => patchVendedor({ naturalezaVendedor: e.target.value as NaturalezaVendedorAutofactura })}
                    >
                      <option value="NO_CONTRIBUYENTE">No contribuyente</option>
                      <option value="EXTRANJERO">Extranjero</option>
                    </Select>
                  </FormField>
                  <FormField label="Nombre y apellido del vendedor" required>
                    <Input value={datosVendedor.nombreVendedor} onChange={(e) => patchVendedor({ nombreVendedor: e.target.value })} />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Tipo de documento" required>
                    <Select
                      value={datosVendedor.tipoDocIdentidadVendedor}
                      onChange={(e) => patchVendedor({ tipoDocIdentidadVendedor: e.target.value as TipoDocumentoIdentidad })}
                    >
                      <option value="">Elegir…</option>
                      {TIPO_DOC_VENDEDOR.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Número de documento" required>
                    <Input
                      value={datosVendedor.numeroDocIdentidadVendedor}
                      onChange={(e) => patchVendedor({ numeroDocIdentidadVendedor: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-ink-500">Domicilio del vendedor</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <FormField label="Dirección" required>
                        <Input
                          value={datosVendedor.direccionVendedor}
                          onChange={(e) => patchVendedor({ direccionVendedor: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Nº casa" required>
                      <Input
                        value={datosVendedor.numeroCasaVendedor}
                        onChange={(e) => patchVendedor({ numeroCasaVendedor: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Ciudad" required>
                      <Input value={datosVendedor.ciudadVendedor} onChange={(e) => patchVendedor({ ciudadVendedor: e.target.value })} />
                    </FormField>
                  </div>
                  <div className="mt-4">
                    <FormField label="Departamento" required>
                      <Input
                        value={datosVendedor.departamentoVendedor}
                        onChange={(e) => patchVendedor({ departamentoVendedor: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-ink-500">
                    Lugar de la transacción
                    {datosVendedor.naturalezaVendedor === 'EXTRANJERO' ? ' (donde se realizó la operación en Paraguay)' : ''}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Dirección" required>
                      <Input
                        value={datosVendedor.direccionTransaccion}
                        onChange={(e) => patchVendedor({ direccionTransaccion: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Ciudad" required>
                      <Input
                        value={datosVendedor.ciudadTransaccion}
                        onChange={(e) => patchVendedor({ ciudadTransaccion: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Departamento" required>
                      <Input
                        value={datosVendedor.departamentoTransaccion}
                        onChange={(e) => patchVendedor({ departamentoTransaccion: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            )}

            {esRemision && (
              <div className="flex flex-col gap-4 rounded-md border border-ink-200 p-4">
                <h3 className="text-sm font-semibold text-ink-800">Datos de la Nota de Remisión</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Motivo de emisión" required>
                    <Select
                      value={datosRemision.motivoEmision}
                      onChange={(e) => patchRemision({ motivoEmision: e.target.value as MotivoEmisionNotaRemision })}
                    >
                      {(Object.keys(MOTIVO_REMISION_LABEL) as MotivoEmisionNotaRemision[]).map((v) => (
                        <option key={v} value={v}>
                          {MOTIVO_REMISION_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Responsable de la emisión" required>
                    <Select
                      value={datosRemision.responsableEmision}
                      onChange={(e) => patchRemision({ responsableEmision: e.target.value as ResponsableEmisionNotaRemision })}
                    >
                      {(Object.keys(RESPONSABLE_EMISION_REMISION_LABEL) as ResponsableEmisionNotaRemision[]).map((v) => (
                        <option key={v} value={v}>
                          {RESPONSABLE_EMISION_REMISION_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                {datosRemision.motivoEmision === 'OTRO' && (
                  <FormField label="Describir motivo" required>
                    <Input
                      value={datosRemision.motivoEmisionOtro}
                      onChange={(e) => patchRemision({ motivoEmisionOtro: e.target.value })}
                    />
                  </FormField>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Tipo de transporte" required>
                    <Select
                      value={datosRemision.tipoTransporte}
                      onChange={(e) => patchRemision({ tipoTransporte: e.target.value as TipoTransporte })}
                    >
                      <option value="PROPIO">Propio</option>
                      <option value="TERCERO">Tercero</option>
                    </Select>
                  </FormField>
                  <FormField label="Modalidad" required>
                    <Select
                      value={datosRemision.modalidadTransporte}
                      onChange={(e) => patchRemision({ modalidadTransporte: e.target.value as ModalidadTransporte })}
                    >
                      <option value="TERRESTRE">Terrestre</option>
                      <option value="FLUVIAL">Fluvial</option>
                      <option value="AEREO">Aéreo</option>
                      <option value="MULTIMODAL">Multimodal</option>
                    </Select>
                  </FormField>
                  <FormField label="Responsable del flete" required>
                    <Select
                      value={datosRemision.responsableFlete}
                      onChange={(e) => patchRemision({ responsableFlete: e.target.value as ResponsableFlete })}
                    >
                      {(Object.keys(RESPONSABLE_FLETE_LABEL) as ResponsableFlete[]).map((v) => (
                        <option key={v} value={v}>
                          {RESPONSABLE_FLETE_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Fecha estimada de inicio de traslado" required>
                    <Input
                      type="date"
                      value={datosRemision.fechaInicioTraslado}
                      onChange={(e) => patchRemision({ fechaInicioTraslado: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Fecha estimada de fin de traslado" required>
                    <Input
                      type="date"
                      value={datosRemision.fechaFinTraslado}
                      onChange={(e) => patchRemision({ fechaFinTraslado: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Local de salida</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <FormField label="Dirección" required>
                        <Input
                          value={datosRemision.direccionSalida}
                          onChange={(e) => patchRemision({ direccionSalida: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Nº casa" required>
                      <Input
                        value={datosRemision.numeroCasaSalida}
                        onChange={(e) => patchRemision({ numeroCasaSalida: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Ciudad" required>
                      <Input value={datosRemision.ciudadSalida} onChange={(e) => patchRemision({ ciudadSalida: e.target.value })} />
                    </FormField>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    <FormField label="Departamento" required>
                      <Input
                        value={datosRemision.departamentoSalida}
                        onChange={(e) => patchRemision({ departamentoSalida: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Local de entrega</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <FormField label="Dirección" required>
                        <Input
                          value={datosRemision.direccionEntrega}
                          onChange={(e) => patchRemision({ direccionEntrega: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Nº casa" required>
                      <Input
                        value={datosRemision.numeroCasaEntrega}
                        onChange={(e) => patchRemision({ numeroCasaEntrega: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Ciudad" required>
                      <Input
                        value={datosRemision.ciudadEntrega}
                        onChange={(e) => patchRemision({ ciudadEntrega: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    <FormField label="Departamento" required>
                      <Input
                        value={datosRemision.departamentoEntrega}
                        onChange={(e) => patchRemision({ departamentoEntrega: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Vehículo</p>
                  <div className="grid grid-cols-4 gap-4">
                    <FormField label="Tipo (ej. Camión)" required>
                      <Input value={datosRemision.tipoVehiculo} onChange={(e) => patchRemision({ tipoVehiculo: e.target.value })} />
                    </FormField>
                    <FormField label="Marca" required>
                      <Input value={datosRemision.marcaVehiculo} onChange={(e) => patchRemision({ marcaVehiculo: e.target.value })} />
                    </FormField>
                    <FormField label="Se identifica por" required>
                      <Select
                        value={datosRemision.tipoIdentificacionVehiculo}
                        onChange={(e) =>
                          patchRemision({ tipoIdentificacionVehiculo: e.target.value as TipoIdentificacionVehiculo })
                        }
                      >
                        <option value="MATRICULA">Matrícula</option>
                        <option value="NUMERO_IDENTIFICACION">Número de identificación</option>
                      </Select>
                    </FormField>
                    {datosRemision.tipoIdentificacionVehiculo === 'MATRICULA' ? (
                      <FormField label="Matrícula" required>
                        <Input
                          value={datosRemision.numeroMatriculaVehiculo}
                          onChange={(e) => patchRemision({ numeroMatriculaVehiculo: e.target.value })}
                        />
                      </FormField>
                    ) : (
                      <FormField label="Número de identificación" required>
                        <Input
                          value={datosRemision.numeroIdentificacionVehiculo}
                          onChange={(e) => patchRemision({ numeroIdentificacionVehiculo: e.target.value })}
                        />
                      </FormField>
                    )}
                  </div>
                  {datosRemision.modalidadTransporte === 'AEREO' && (
                    <div className="mt-2 grid grid-cols-4 gap-4">
                      <FormField label="Número de vuelo" required>
                        <Input value={datosRemision.numeroVuelo} onChange={(e) => patchRemision({ numeroVuelo: e.target.value })} />
                      </FormField>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Transportista y chofer</p>
                  <div className="grid grid-cols-4 gap-4">
                    <FormField label="Naturaleza" required>
                      <Select
                        value={datosRemision.naturalezaTransportista}
                        onChange={(e) => patchRemision({ naturalezaTransportista: e.target.value as NaturalezaTransportista })}
                      >
                        <option value="CONTRIBUYENTE">Contribuyente</option>
                        <option value="NO_CONTRIBUYENTE">No contribuyente</option>
                      </Select>
                    </FormField>
                    <div className="col-span-2">
                      <FormField label="Nombre o razón social" required>
                        <Input
                          value={datosRemision.nombreTransportista}
                          onChange={(e) => patchRemision({ nombreTransportista: e.target.value })}
                        />
                      </FormField>
                    </div>
                    {datosRemision.naturalezaTransportista === 'CONTRIBUYENTE' ? (
                      <FormField label="RUC" required>
                        <Input
                          value={datosRemision.rucTransportista}
                          onChange={(e) => patchRemision({ rucTransportista: e.target.value })}
                        />
                      </FormField>
                    ) : (
                      <FormField label="Tipo de documento" required>
                        <Select
                          value={datosRemision.tipoDocIdentidadTransportista}
                          onChange={(e) => patchRemision({ tipoDocIdentidadTransportista: e.target.value as TipoDocumentoIdentidad })}
                        >
                          <option value="" disabled>
                            Elegir…
                          </option>
                          {TIPO_DOC_TRANSPORTISTA.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    )}
                  </div>
                  {datosRemision.naturalezaTransportista === 'NO_CONTRIBUYENTE' && (
                    <div className="mt-2 grid grid-cols-4 gap-4">
                      <FormField label="Número de documento" required>
                        <Input
                          value={datosRemision.numeroDocIdentidadTransportista}
                          onChange={(e) => patchRemision({ numeroDocIdentidadTransportista: e.target.value })}
                        />
                      </FormField>
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-4 gap-4">
                    <FormField label="Documento del chofer" required>
                      <Input
                        value={datosRemision.numeroDocIdentidadChofer}
                        onChange={(e) => patchRemision({ numeroDocIdentidadChofer: e.target.value })}
                      />
                    </FormField>
                    <div className="col-span-2">
                      <FormField label="Nombre del chofer" required>
                        <Input
                          value={datosRemision.nombreChofer}
                          onChange={(e) => patchRemision({ nombreChofer: e.target.value })}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-800">Ítems</h3>
                <Button type="button" variant="secondary" size="sm" onClick={() => setItems((r) => [...r, emptyRow()])}>
                  + Agregar ítem
                </Button>
              </div>
              <div className="flex flex-col gap-3">
                {itemsCalculados.map(({ row, calc }) => (
                  <div key={row.key} className="rounded-md border border-ink-200 p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <Select
                          value={row.productoId}
                          onChange={(e) => selectProducto(row.key, e.target.value)}
                          className="text-xs"
                        >
                          <option value="">Ítem libre (sin producto)</option>
                          {productos?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.codigo} — {p.descripcion}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Descripción"
                          value={row.descripcion}
                          onChange={(e) => updateRow(row.key, { descripcion: e.target.value })}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={row.unidadMedidaId}
                          onChange={(e) => updateRow(row.key, { unidadMedidaId: e.target.value })}
                          className="text-xs"
                        >
                          <option value="" disabled>
                            Unidad…
                          </option>
                          {unidades?.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.descripcion}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setItems((r) => r.filter((x) => x.key !== row.key))}
                          disabled={items.length === 1}
                          className="text-xs text-ink-400 hover:text-red-600 disabled:opacity-30"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Cant."
                          value={row.cantidad}
                          onChange={(e) => updateRow(row.key, { cantidad: e.target.value })}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Precio"
                          value={row.precioUnitario}
                          onChange={(e) => updateRow(row.key, { precioUnitario: e.target.value })}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Desc."
                          value={row.descuento}
                          onChange={(e) => updateRow(row.key, { descuento: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={row.afectacionIva}
                          onChange={(e) => updateRow(row.key, { afectacionIva: e.target.value as AfectacionIVA })}
                          className="text-xs"
                        >
                          <option value="GRAVADO">Gravado</option>
                          <option value="GRAVADO_PARCIAL">Grav. parcial</option>
                          <option value="EXENTO">Exento</option>
                          <option value="EXONERADO">Exonerado</option>
                        </Select>
                      </div>
                      {(row.afectacionIva === 'GRAVADO' || row.afectacionIva === 'GRAVADO_PARCIAL') && (
                        <div className="col-span-1">
                          <Select
                            value={row.tasaIva}
                            onChange={(e) => updateRow(row.key, { tasaIva: Number(e.target.value) })}
                            className="text-xs"
                          >
                            <option value={10}>10%</option>
                            <option value={5}>5%</option>
                          </Select>
                        </div>
                      )}
                      <div className="col-span-2 flex items-center justify-end text-sm font-medium tabular-nums text-ink-700">
                        {formatGs(calc.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FormField label="Observación">
              <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </FormField>

            <div className="flex flex-col items-end gap-1 border-t border-ink-100 pt-3 text-sm">
              {subtotales.subtotalExenta > 0 && (
                <p className="text-ink-500">
                  Exento: <span className="tabular-nums text-ink-700">{formatGs(subtotales.subtotalExenta)}</span>
                </p>
              )}
              {subtotales.subtotalGravada10 > 0 && (
                <p className="text-ink-500">
                  Gravado 10%: <span className="tabular-nums text-ink-700">{formatGs(subtotales.subtotalGravada10)}</span>{' '}
                  (IVA {formatGs(subtotales.iva10)})
                </p>
              )}
              {subtotales.subtotalGravada5 > 0 && (
                <p className="text-ink-500">
                  Gravado 5%: <span className="tabular-nums text-ink-700">{formatGs(subtotales.subtotalGravada5)}</span>{' '}
                  (IVA {formatGs(subtotales.iva5)})
                </p>
              )}
              <p className="text-base font-semibold text-ink-900">
                Total: <span className="tabular-nums">{formatGs(subtotales.total)}</span>
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={reiniciarFormulario}>
                Limpiar
              </Button>
              <Button type="submit" disabled={!puedeEmitir}>
                Previsualizar
              </Button>
            </div>
          </form>
        )}
      </Card>

      <FiscalSetupDialog
        open={fiscalSetupOpen}
        onClose={() => {
          setFiscalSetupOpen(false);
          queryClient.invalidateQueries({ queryKey: ['puntos-expedicion'] });
        }}
        tipoDocumentoSugerido={tipoDocumento}
      />

      <Dialog open={rucDialogOpen} onClose={() => setRucDialogOpen(false)} title="Buscar en DNIT">
        {rucDialogError && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rucDialogError}</div>}
        {creandoTercero ? (
          <p className="py-4 text-center text-sm text-ink-500">Guardando cliente…</p>
        ) : (
          <RucSearchBox onSelect={elegirClienteDnit} />
        )}
      </Dialog>
    </div>
  );
}
