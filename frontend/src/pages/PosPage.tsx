import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { useAuth } from '../lib/auth-context';
import { formatGs, formatDateTime } from '../lib/format';
import { calcularItem, calcularSubtotales } from '../lib/comprobante-calc';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { Dialog } from '../components/ui/Dialog';
import { FiscalSetupDialog } from './FiscalSetupDialog';
import { RucSearchBox, type ResultadoBusquedaRuc } from '../components/RucSearch';
import type {
  AfectacionIVA,
  Comprobante,
  CuentaBancaria,
  Deposito,
  Establecimiento,
  FormaPago,
  Producto,
  PuntoExpedicion,
  SesionCaja,
  Tercero,
} from '../lib/types';

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'BILLETERA_ELECTRONICA', label: 'Billetera electrónica' },
  { value: 'OTRO', label: 'Otro' },
];

const FORMA_PAGO_LABEL: Record<string, string> = Object.fromEntries(FORMAS_PAGO.map((f) => [f.value, f.label]));

// Mismo criterio que en Recibos/Facturación: para estas formas de pago se
// ofrece elegir la cuenta bancaria puntual y asi generar el movimiento en
// Bancos listo para conciliar.
const FORMAS_PAGO_BANCARIAS = new Set<FormaPago>(['TRANSFERENCIA', 'BILLETERA_ELECTRONICA']);

interface CartItem {
  key: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  unidadMedidaId: string;
  precioUnitario: number;
  afectacionIva: AfectacionIVA;
  tasaIva: number;
}

export default function PosPage() {
  const empresaId = useEmpresaId();
  const { esAdmin, usuario } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fiscalSetupOpen, setFiscalSetupOpen] = useState(false);

  const [montoInicial, setMontoInicial] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('EFECTIVO');
  const [cuentaBancariaId, setCuentaBancariaId] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [ventaConfirmada, setVentaConfirmada] = useState<{ id: string; numero: string; total: number } | null>(null);

  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [montoDeclarado, setMontoDeclarado] = useState('');
  const [observacionCierre, setObservacionCierre] = useState('');
  const [cierreResultado, setCierreResultado] = useState<SesionCaja | null>(null);

  const [establecimientoId, setEstablecimientoId] = useState('');
  const [puntoExpedicionId, setPuntoExpedicionId] = useState('');

  const { data: establecimientos, isLoading: establecimientosLoading } = useQuery({
    queryKey: ['establecimientos', empresaId],
    queryFn: async () => (await api.get<Establecimiento[]>('/establecimientos', { params: { empresaId } })).data,
  });
  const establecimiento = establecimientos?.find((e) => e.id === establecimientoId);

  // Si el operador esta restringido a ciertos puntos de expedicion (ver
  // PuntosExpedicionGuard), no tiene sentido ofrecerle en el selector un
  // establecimiento/PE en el que igual le van a rechazar la apertura de caja.
  const puntosPermitidos = usuario?.puntosExpedicionPermitidos ?? [];
  const restringidoPorPE = !esAdmin && puntosPermitidos.length > 0;
  const establecimientosVisibles = !restringidoPorPE
    ? establecimientos
    : establecimientos?.filter((e) => e.puntosExpedicion?.some((p) => puntosPermitidos.includes(p.id)));

  // Preseleccionar la casa matriz (o el primero que haya) apenas carga la
  // lista -- se puede cambiar despues con el selector, mientras no haya caja
  // abierta (una sesion de caja queda atada a un solo punto de expedicion).
  useEffect(() => {
    if (!establecimientoId && establecimientosVisibles?.length) {
      setEstablecimientoId(establecimientosVisibles.find((e) => e.esCasaMatriz)?.id ?? establecimientosVisibles[0].id);
    }
  }, [establecimientosVisibles, establecimientoId]);

  const {
    data: puntosExpedicion,
    isLoading: puntosExpedicionLoading,
    isFetched: puntosExpedicionFetched,
  } = useQuery({
    queryKey: ['puntos-expedicion', establecimientoId],
    queryFn: async () =>
      (await api.get<PuntoExpedicion[]>('/puntos-expedicion', { params: { establecimientoId } })).data,
    enabled: Boolean(establecimientoId),
  });
  const puntoExpedicion = puntosExpedicion?.find((p) => p.id === puntoExpedicionId);
  const puntosExpedicionVisibles = !restringidoPorPE
    ? puntosExpedicion
    : puntosExpedicion?.filter((p) => puntosPermitidos.includes(p.id));

  useEffect(() => {
    if (!puntosExpedicionVisibles?.length) {
      setPuntoExpedicionId('');
      return;
    }
    if (!puntosExpedicionVisibles.find((p) => p.id === puntoExpedicionId)) {
      setPuntoExpedicionId(puntosExpedicionVisibles[0].id);
    }
  }, [puntosExpedicionVisibles, puntoExpedicionId]);

  const timbradosDisponibles = useMemo(
    () =>
      (puntoExpedicion?.timbrados ?? []).filter(
        (t) => t.activo && t.tipoDocumento === 'FACTURA_ELECTRONICA' && t.proximoNumero <= t.numeroHasta,
      ),
    [puntoExpedicion],
  );
  const timbrado = timbradosDisponibles[0];

  const {
    data: sesion,
    isLoading: sesionLoading,
    isFetched: sesionFetched,
  } = useQuery({
    queryKey: ['sesion-caja-actual', puntoExpedicion?.id],
    queryFn: async () =>
      (await api.get<SesionCaja | null>('/caja/sesiones/actual', { params: { puntoExpedicionId: puntoExpedicion!.id } })).data,
    enabled: Boolean(puntoExpedicion),
  });

  const { data: productos } = useQuery({
    queryKey: ['productos-select', empresaId],
    queryFn: async () => (await api.get<Producto[]>('/productos', { params: { empresaId } })).data,
    enabled: Boolean(sesion),
  });

  const { data: depositos } = useQuery({
    queryKey: ['depositos', empresaId],
    queryFn: async () => (await api.get<Deposito[]>('/depositos', { params: { empresaId } })).data,
    enabled: Boolean(sesion),
  });
  useEffect(() => {
    if (!depositoId && depositos?.length) {
      setDepositoId(depositos.find((d) => d.esPrincipal)?.id ?? depositos[0].id);
    }
  }, [depositos, depositoId]);

  const esFormaPagoBancaria = FORMAS_PAGO_BANCARIAS.has(formaPago);
  // Se ofrece elegir la cuenta bancaria solo para formas de pago bancarias.
  // Si la consulta falla (ej. operador sin acceso a Bancos), simplemente no
  // se muestra el selector y la venta se registra igual, sin enlazar banco.
  const { data: cuentasBancarias } = useQuery({
    queryKey: ['cuentas-bancarias', empresaId],
    queryFn: async () => (await api.get<CuentaBancaria[]>('/cuentas-bancarias', { params: { empresaId } })).data,
    enabled: esFormaPagoBancaria,
    retry: false,
  });
  useEffect(() => {
    if (!esFormaPagoBancaria) setCuentaBancariaId('');
  }, [esFormaPagoBancaria]);

  const { data: clientes } = useQuery({
    queryKey: ['terceros-select', empresaId, 'CLIENTE'],
    queryFn: async () => (await api.get<Tercero[]>('/terceros', { params: { empresaId, tipo: 'CLIENTE' } })).data,
    enabled: Boolean(sesion),
  });

  const [rucDialogOpen, setRucDialogOpen] = useState(false);
  const [creandoTercero, setCreandoTercero] = useState(false);
  const [rucDialogError, setRucDialogError] = useState<string | null>(null);

  // Mismo criterio que EmitirComprobantePage: si el RUC buscado ya existe
  // como cliente lo seleccionamos directo, si no lo damos de alta al vuelo
  // con lo minimo indispensable para no cortar la venta en el mostrador.
  const elegirClienteDnit = async (r: ResultadoBusquedaRuc) => {
    const existente = clientes?.find((t) => t.numeroDocumento === r.ruc);
    if (existente) {
      setClienteId(existente.id);
      setRucDialogOpen(false);
      return;
    }

    setCreandoTercero(true);
    setRucDialogError(null);
    try {
      const nuevo = (
        await api.post<Tercero>('/terceros', {
          empresaId,
          tipo: 'CLIENTE',
          tipoDocumento: 'RUC',
          numeroDocumento: r.ruc,
          dvRuc: r.dv,
          razonSocial: r.razonSocial,
          tipoContribuyente: r.tipoContribuyente,
          activo: true,
        })
      ).data;
      await queryClient.invalidateQueries({ queryKey: ['terceros-select', empresaId] });
      setClienteId(nuevo.id);
      setRucDialogOpen(false);
    } catch (err) {
      setRucDialogError(apiErrorMessage(err));
    } finally {
      setCreandoTercero(false);
    }
  };

  const resultadosBusqueda = useMemo(() => {
    if (!busqueda.trim() || !productos) return [];
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.activo && (p.descripcion.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))).slice(0, 8);
  }, [busqueda, productos]);

  function agregarProducto(producto: Producto) {
    setCart((rows) => {
      const existente = rows.find((r) => r.productoId === producto.id);
      if (existente) {
        return rows.map((r) => (r.productoId === producto.id ? { ...r, cantidad: r.cantidad + 1 } : r));
      }
      return [
        ...rows,
        {
          key: crypto.randomUUID(),
          productoId: producto.id,
          descripcion: producto.descripcion,
          cantidad: 1,
          unidadMedidaId: producto.unidadMedidaId,
          precioUnitario: Number(producto.precioVenta),
          afectacionIva: producto.afectacionIva,
          tasaIva: producto.tasaIva,
        },
      ];
    });
    setBusqueda('');
  }

  function cambiarCantidad(key: string, cantidad: number) {
    setCart((rows) =>
      cantidad <= 0 ? rows.filter((r) => r.key !== key) : rows.map((r) => (r.key === key ? { ...r, cantidad } : r)),
    );
  }

  const itemsCalculados = cart.map((row) => ({
    row,
    calc: calcularItem({
      cantidad: row.cantidad,
      precioUnitario: row.precioUnitario,
      afectacionIva: row.afectacionIva,
      tasaIva: row.tasaIva,
    }),
  }));
  const subtotales = calcularSubtotales(itemsCalculados.map((i) => i.calc));
  const vuelto = formaPago === 'EFECTIVO' && montoRecibido ? Math.max(0, Number(montoRecibido) - subtotales.total) : 0;

  function limpiarVenta() {
    setCart([]);
    setClienteId('');
    setFormaPago('EFECTIVO');
    setCuentaBancariaId('');
    setMontoRecibido('');
    setVentaConfirmada(null);
    setError(null);
  }

  const abrirCajaMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<SesionCaja>('/caja/sesiones', {
          empresaId,
          puntoExpedicionId: puntoExpedicion!.id,
          montoInicial: Number(montoInicial),
        })
      ).data,
    onSuccess: () => {
      setMontoInicial('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['sesion-caja-actual'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const cobrarMutation = useMutation({
    mutationFn: async () => {
      // El ComprobantePago (E606) lo genera ComprobantesService.create() solo
      // -- antes ademas se creaba a mano aca con un POST separado, duplicando
      // el pago (y por lo tanto duplicando el "total cobrado" en el arqueo
      // de cierre de caja, que suma ComprobantePago.monto).
      const comprobante = (
        await api.post<Comprobante>('/comprobantes', {
          empresaId,
          puntoExpedicionId: puntoExpedicion!.id,
          timbradoId: timbrado!.id,
          tipoDocumento: 'FACTURA_ELECTRONICA',
          clienteId: clienteId || undefined,
          condicionVenta: 'CONTADO',
          depositoId: depositoId || undefined,
          sesionCajaId: sesion!.id,
          formaPago,
          cuentaBancariaId: esFormaPagoBancaria && cuentaBancariaId ? cuentaBancariaId : undefined,
          items: cart.map((row) => ({
            productoId: row.productoId,
            descripcion: row.descripcion,
            cantidad: row.cantidad,
            unidadMedidaId: row.unidadMedidaId,
            precioUnitario: row.precioUnitario,
            afectacionIva: row.afectacionIva,
            tasaIva: row.tasaIva,
          })),
        })
      ).data;
      return comprobante;
    },
    onSuccess: (comprobante) => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['sesion-caja-actual'] });
      queryClient.invalidateQueries({ queryKey: ['puntos-expedicion'] });
      setVentaConfirmada({ id: comprobante.id, numero: comprobante.numero, total: Number(comprobante.total) });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const cerrarCajaMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<SesionCaja>(`/caja/sesiones/${sesion!.id}/cerrar`, {
          montoFinalDeclarado: Number(montoDeclarado),
          observacion: observacionCierre || undefined,
        })
      ).data,
    onSuccess: (sesionCerrada) => {
      setCierreResultado(sesionCerrada);
      queryClient.invalidateQueries({ queryKey: ['sesion-caja-actual'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const efectivoEnCaja =
    (sesion?.resumenPagos ?? []).find((r) => r.formaPago === 'EFECTIVO')?.total ?? 0;
  const efectivoEsperado = sesion ? Number(sesion.montoInicial) + efectivoEnCaja : 0;
  const diferenciaPreview = montoDeclarado ? Number(montoDeclarado) - efectivoEsperado : 0;

  const puedeCobrar = cart.length > 0 && Boolean(timbrado) && cart.every((r) => r.cantidad > 0);

  // Ojo: puntosExpedicion y sesion son queries encadenadas y condicionales
  // (enabled: Boolean(...)). Si la empresa todavia no tiene establecimiento o
  // punto de expedicion, esas queries quedan deshabilitadas para siempre --
  // isFetched nunca pasa a true, asi que NO alcanza con "sesionLoading ||
  // !sesionFetched" solo, o la pantalla queda en "Cargando..." de por vida.
  const cargando =
    establecimientosLoading ||
    (Boolean(establecimiento) && (puntosExpedicionLoading || !puntosExpedicionFetched)) ||
    (Boolean(puntoExpedicion) && (sesionLoading || !sesionFetched));

  if (cargando) {
    return <p className="text-sm text-ink-500">Cargando…</p>;
  }

  if (!establecimiento || !puntoExpedicion) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Punto de venta</h1>
          <p className="mt-1 text-sm text-ink-500">Venta rápida de mostrador, con control de caja.</p>
        </div>
        <Card className="mx-auto w-full max-w-md p-5 text-center">
          <p className="text-sm text-ink-600">
            Esta empresa todavía no tiene un establecimiento y punto de expedición configurados -- son
            necesarios antes de poder abrir caja.
          </p>
          <Button className="mt-4" onClick={() => setFiscalSetupOpen(true)}>
            Configurar…
          </Button>
        </Card>
        <FiscalSetupDialog
          open={fiscalSetupOpen}
          onClose={() => {
            setFiscalSetupOpen(false);
            queryClient.invalidateQueries({ queryKey: ['establecimientos'] });
            queryClient.invalidateQueries({ queryKey: ['puntos-expedicion'] });
          }}
          tipoDocumentoSugerido="FACTURA_ELECTRONICA"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Punto de venta</h1>
          <p className="mt-1 text-sm text-ink-500">Venta rápida de mostrador, con control de caja.</p>
        </div>
        {sesion && (
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-ink-500">
              <p>
                Caja abierta por <span className="font-medium text-ink-700">{sesion.usuarioApertura?.nombre}</span>
              </p>
              <p>desde {formatDateTime(sesion.fechaApertura)}</p>
              <p>
                {establecimiento?.codigo} — {puntoExpedicion?.codigo} {puntoExpedicion?.descripcion}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setMontoDeclarado('');
                setObservacionCierre('');
                setCierreResultado(null);
                setError(null);
                setCerrarOpen(true);
              }}
            >
              Cerrar caja
            </Button>
          </div>
        )}
      </div>

      {!sesion ? (
        <Card className="mx-auto w-full max-w-sm p-5">
          <h2 className="text-base font-semibold text-ink-900">Abrir caja</h2>
          <p className="mt-1 text-sm text-ink-500">
            Registrá el monto con el que arrancás el turno para poder arquear al cerrar.
          </p>
          {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              abrirCajaMutation.mutate();
            }}
          >
            {establecimientosVisibles && establecimientosVisibles.length > 1 && (
              <FormField label="Establecimiento" required>
                <Select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)}>
                  {establecimientosVisibles.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.codigo} — {est.nombre}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {puntosExpedicionVisibles && puntosExpedicionVisibles.length > 1 && (
              <FormField label="Punto de expedición" required>
                <Select value={puntoExpedicionId} onChange={(e) => setPuntoExpedicionId(e.target.value)}>
                  {puntosExpedicionVisibles.map((pe) => (
                    <option key={pe.id} value={pe.id}>
                      {pe.codigo} — {pe.descripcion}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Monto inicial (₲)" required>
              <Input
                type="number"
                min="0"
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                required
                autoFocus
              />
            </FormField>
            <Button type="submit" disabled={abrirCajaMutation.isPending || !puntoExpedicion}>
              {abrirCajaMutation.isPending ? 'Abriendo…' : 'Abrir caja'}
            </Button>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="p-5">
            {!timbrado && (
              <div className="mb-4 flex flex-col gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p>No hay timbrado vigente para Factura Electrónica -- no vas a poder cobrar hasta configurar uno.</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => setFiscalSetupOpen(true)}>
                  Configurar timbrado…
                </Button>
              </div>
            )}

            <FormField label="Buscar producto (nombre o código)">
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: agua, SKU-001…"
                autoFocus
              />
            </FormField>

            {resultadosBusqueda.length > 0 && (
              <div className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-200">
                {resultadosBusqueda.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregarProducto(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
                  >
                    <span>
                      <span className="text-ink-400">{p.codigo}</span> — {p.descripcion}
                    </span>
                    <span className="tabular-nums text-ink-700">{formatGs(p.precioVenta)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-ink-800">Carrito</h3>
              {cart.length === 0 ? (
                <p className="rounded-md border border-dashed border-ink-200 px-3 py-8 text-center text-sm text-ink-400">
                  Buscá un producto para agregarlo.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-ink-100 rounded-md border border-ink-200">
                  {itemsCalculados.map(({ row, calc }) => (
                    <div key={row.key} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1">
                        <p className="text-sm text-ink-900">{row.descripcion}</p>
                        <p className="text-xs text-ink-400">{formatGs(row.precioUnitario)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(row.key, row.cantidad - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{row.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(row.key, row.cantidad + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-24 text-right text-sm font-medium tabular-nums text-ink-900">
                        {formatGs(calc.total)}
                      </div>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(row.key, 0)}
                        className="text-xs text-ink-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="flex h-fit flex-col gap-4 p-5">
            {ventaConfirmada ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-ink-900">Factura Nº {ventaConfirmada.numero}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink-900">{formatGs(ventaConfirmada.total)}</p>
                  {vuelto > 0 && <p className="mt-1 text-sm text-ink-500">Vuelto: {formatGs(vuelto)}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => window.open(`/imprimir/comprobantes/${ventaConfirmada.id}`, '_blank')}>
                    Imprimir
                  </Button>
                  <Button onClick={limpiarVenta}>Nueva venta</Button>
                </div>
              </div>
            ) : (
              <>
                {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                <FormField label="Cliente (opcional)">
                  <div className="flex gap-2">
                    <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1">
                      <option value="">Consumidor final</option>
                      {clientes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razonSocial}
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

                {depositos && depositos.length > 0 && (
                  <FormField label="Depósito">
                    <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value)}>
                      <option value="">No afectar stock</option>
                      {depositos.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}

                <FormField label="Forma de pago">
                  <Select value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPago)}>
                    {FORMAS_PAGO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {esFormaPagoBancaria && cuentasBancarias && cuentasBancarias.length > 0 && (
                  <FormField label="Cuenta bancaria (opcional, para reflejar el cobro en Bancos)">
                    <Select value={cuentaBancariaId} onChange={(e) => setCuentaBancariaId(e.target.value)}>
                      <option value="">No registrar en Bancos</option>
                      {cuentasBancarias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} — {c.banco} · {c.numeroCuenta}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}

                {formaPago === 'EFECTIVO' && (
                  <FormField label="Monto recibido (₲)">
                    <Input
                      type="number"
                      min="0"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder={String(subtotales.total)}
                    />
                  </FormField>
                )}

                <div className="flex flex-col gap-1 border-t border-ink-100 pt-3 text-sm">
                  <p className="flex justify-between text-base font-semibold text-ink-900">
                    <span>Total</span>
                    <span className="tabular-nums">{formatGs(subtotales.total)}</span>
                  </p>
                  {vuelto > 0 && (
                    <p className="flex justify-between text-ink-600">
                      <span>Vuelto</span>
                      <span className="tabular-nums">{formatGs(vuelto)}</span>
                    </p>
                  )}
                </div>

                <Button
                  size="md"
                  className="w-full justify-center py-3 text-base"
                  disabled={!puedeCobrar || cobrarMutation.isPending}
                  onClick={() => cobrarMutation.mutate()}
                >
                  {cobrarMutation.isPending ? 'Cobrando…' : 'Cobrar'}
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      <FiscalSetupDialog
        open={fiscalSetupOpen}
        onClose={() => {
          setFiscalSetupOpen(false);
          queryClient.invalidateQueries({ queryKey: ['puntos-expedicion'] });
        }}
        tipoDocumentoSugerido="FACTURA_ELECTRONICA"
      />

      <Dialog open={cerrarOpen} onClose={() => setCerrarOpen(false)} title={cierreResultado ? 'Caja cerrada' : 'Cerrar caja'}>
        {cierreResultado ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md bg-ink-50 px-3 py-3 text-sm">
              <p className="flex justify-between">
                <span className="text-ink-500">Monto inicial</span>
                <span className="tabular-nums">{formatGs(cierreResultado.montoInicial)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-ink-500">Efectivo esperado</span>
                <span className="tabular-nums">{formatGs(cierreResultado.montoFinalCalculado ?? 0)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-ink-500">Contado</span>
                <span className="tabular-nums">{formatGs(cierreResultado.montoFinalDeclarado ?? 0)}</span>
              </p>
              <p className="mt-1 flex justify-between border-t border-ink-200 pt-1 font-semibold">
                <span>Diferencia</span>
                <span
                  className={`tabular-nums ${Number(cierreResultado.diferencia) === 0 ? 'text-ink-900' : Number(cierreResultado.diferencia) > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {formatGs(cierreResultado.diferencia ?? 0)}
                </span>
              </p>
            </div>
            <Button
              onClick={() => {
                setCerrarOpen(false);
                limpiarVenta();
              }}
            >
              Listo
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              cerrarCajaMutation.mutate();
            }}
          >
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="rounded-md bg-ink-50 px-3 py-3 text-sm">
              <p className="flex justify-between">
                <span className="text-ink-500">Monto inicial</span>
                <span className="tabular-nums">{formatGs(sesion?.montoInicial ?? 0)}</span>
              </p>
              {(sesion?.resumenPagos ?? []).map((r) => (
                <p key={r.formaPago} className="flex justify-between text-ink-500">
                  <span>{FORMA_PAGO_LABEL[r.formaPago] ?? r.formaPago}</span>
                  <span className="tabular-nums">{formatGs(r.total)}</span>
                </p>
              ))}
              <p className="mt-1 flex justify-between border-t border-ink-200 pt-1 font-semibold text-ink-900">
                <span>Efectivo esperado en caja</span>
                <span className="tabular-nums">{formatGs(efectivoEsperado)}</span>
              </p>
            </div>

            <FormField label="Efectivo contado (₲)" required>
              <Input
                type="number"
                min="0"
                value={montoDeclarado}
                onChange={(e) => setMontoDeclarado(e.target.value)}
                required
                autoFocus
              />
            </FormField>

            {montoDeclarado && (
              <p className={`text-sm ${diferenciaPreview === 0 ? 'text-ink-500' : diferenciaPreview > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Diferencia: {formatGs(diferenciaPreview)} {diferenciaPreview > 0 ? '(sobrante)' : diferenciaPreview < 0 ? '(faltante)' : ''}
              </p>
            )}

            <FormField label="Observación (opcional)">
              <Input value={observacionCierre} onChange={(e) => setObservacionCierre(e.target.value)} />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCerrarOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={cerrarCajaMutation.isPending}>
                {cerrarCajaMutation.isPending ? 'Cerrando…' : 'Confirmar cierre'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

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
