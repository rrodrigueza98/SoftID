import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { calcularItem, calcularSubtotales } from '../lib/comprobante-calc';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { FiscalSetupDialog } from './FiscalSetupDialog';
import { TIPO_DOCUMENTO_LABEL } from './comprobante-labels';
import { ComprobanteVisual, type ComprobanteVisualData } from './ComprobanteVisual';
import type {
  AfectacionIVA,
  CondicionVenta,
  Comprobante,
  Deposito,
  Empresa,
  Establecimiento,
  MotivoEmisionNotaCD,
  PuntoExpedicion,
  Producto,
  Tercero,
  TipoDocumentoElectronico,
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
  const [depositoId, setDepositoId] = useState('');
  const [comprobanteAsociadoId, setComprobanteAsociadoId] = useState('');
  const [motivoEmision, setMotivoEmision] = useState<MotivoEmisionNotaCD>('DESCUENTO');
  const [observacion, setObservacion] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);

  const esAutofactura = tipoDocumento === 'AUTOFACTURA_ELECTRONICA';
  const esNota = tipoDocumento === 'NOTA_CREDITO_ELECTRONICA' || tipoDocumento === 'NOTA_DEBITO_ELECTRONICA';
  const esFactura = tipoDocumento === 'FACTURA_ELECTRONICA';

  function reiniciarFormulario() {
    setError(null);
    setPreviewing(false);
    setEmitido(null);
    setTipoDocumento('FACTURA_ELECTRONICA');
    setTimbradoId('');
    setClienteId('');
    setProveedorId('');
    setCondicionVenta('CONTADO');
    setDepositoId('');
    setComprobanteAsociadoId('');
    setObservacion('');
    setItems([emptyRow()]);
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
          depositoId: esFactura ? depositoId || undefined : undefined,
          comprobanteAsociadoId: esNota ? comprobanteAsociadoId || undefined : undefined,
          motivoEmision: esNota ? motivoEmision : undefined,
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

  const puedeEmitir =
    Boolean(puntoExpedicion) &&
    Boolean(timbradoId) &&
    (esAutofactura ? Boolean(proveedorId) : Boolean(clienteId)) &&
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
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFiscalSetupOpen(true)}>
                      Configurar timbrado…
                    </Button>
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
                <Select
                  value={esAutofactura ? proveedorId : clienteId}
                  onChange={(e) => (esAutofactura ? setProveedorId(e.target.value) : setClienteId(e.target.value))}
                  required
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
              </FormField>
              <FormField label="Condición de venta">
                <Select value={condicionVenta} onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)}>
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </Select>
              </FormField>
            </div>

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
    </div>
  );
}
