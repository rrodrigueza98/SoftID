import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api, apiErrorMessage } from '../lib/api-client';
import { useDebouncedValue, useEmpresaId } from '../lib/hooks';
import { formatDate, formatDateTime, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { ReciboFormDialog } from './ReciboFormDialog';
import { OrdenPagoFormDialog } from './OrdenPagoFormDialog';
import type { CuentaCorriente, FacturaVencida, MovimientoCuentaCorriente, Tercero, TipoTercero } from '../lib/types';

interface FilaConError {
  fila: number;
  mensaje: string;
}

const CONFIG: Record<
  Extract<TipoTercero, 'CLIENTE' | 'PROVEEDOR'>,
  {
    titulo: string;
    tituloLista: string;
    placeholderBusqueda: string;
    mensajeVacio: string;
    mensajeSinSeleccion: string;
    botonAccion: string;
    // Para un cliente, DEBITO = nos debe mas (factura), CREDITO = pago recibido.
    // Para un proveedor es al reves: CREDITO = les debemos mas (compra),
    // DEBITO = les pagamos.
    toneDebito: 'warning' | 'success';
    toneCredito: 'warning' | 'success';
  }
> = {
  CLIENTE: {
    titulo: 'Cuentas corrientes',
    tituloLista: 'Clientes',
    placeholderBusqueda: 'Buscar cliente…',
    mensajeVacio: 'Sin clientes.',
    mensajeSinSeleccion: 'Elegí un cliente para ver su cuenta corriente.',
    botonAccion: 'Registrar cobro',
    toneDebito: 'warning',
    toneCredito: 'success',
  },
  PROVEEDOR: {
    titulo: 'Cuentas corrientes de proveedores',
    tituloLista: 'Proveedores',
    placeholderBusqueda: 'Buscar proveedor…',
    mensajeVacio: 'Sin proveedores.',
    mensajeSinSeleccion: 'Elegí un proveedor para ver su cuenta corriente.',
    botonAccion: 'Registrar pago',
    toneDebito: 'success',
    toneCredito: 'warning',
  },
};

export default function CuentasCorrientesPage({ tipo = 'CLIENTE' }: { tipo?: 'CLIENTE' | 'PROVEEDOR' }) {
  const cfg = CONFIG[tipo];
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [seleccionado, setSeleccionado] = useState<Tercero | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ creados: number } | null>(null);
  const [importErrores, setImportErrores] = useState<FilaConError[] | null>(null);
  const [importErrorGeneral, setImportErrorGeneral] = useState<string | null>(null);

  const { data: terceros, isLoading: loadingTerceros } = useQuery({
    queryKey: ['terceros', { empresaId, tipo, search: debouncedSearch }],
    queryFn: async () =>
      (
        await api.get<Tercero[]>('/terceros', {
          params: { empresaId, tipo, search: debouncedSearch || undefined },
        })
      ).data,
  });

  const { data: cuenta, isLoading: loadingCuenta } = useQuery({
    queryKey: ['cuenta-corriente', seleccionado?.id],
    queryFn: async () => (await api.get<CuentaCorriente>('/cuentas-corrientes', { params: { terceroId: seleccionado!.id } })).data,
    enabled: Boolean(seleccionado),
  });

  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['cuenta-corriente-movimientos', cuenta?.id],
    queryFn: async () => (await api.get<MovimientoCuentaCorriente[]>(`/cuentas-corrientes/${cuenta!.id}/movimientos`)).data,
    enabled: Boolean(cuenta),
  });

  const { data: facturasVencidas } = useQuery({
    queryKey: ['facturas-vencidas', empresaId],
    queryFn: async () => (await api.get<FacturaVencida[]>('/comprobantes/vencidos', { params: { empresaId } })).data,
    enabled: tipo === 'CLIENTE',
  });

  async function seleccionarPorClienteId(clienteId: string) {
    const { data } = await api.get<Tercero>(`/terceros/${clienteId}`);
    setSeleccionado(data);
  }

  async function handleDescargarPlantilla() {
    setDescargandoPlantilla(true);
    try {
      const res = await api.get('/cuentas-corrientes/plantilla-saldos-iniciales', {
        params: { empresaId, tipo },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla-saldos-iniciales-${tipo === 'CLIENTE' ? 'clientes' : 'proveedores'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDescargandoPlantilla(false);
    }
  }

  async function handleArchivoSeleccionado(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportando(true);
    setImportResultado(null);
    setImportErrores(null);
    setImportErrorGeneral(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ creados: number }>('/cuentas-corrientes/importar-saldos-iniciales', formData, {
        params: { empresaId, tipo },
      });
      setImportResultado(res.data);
      queryClient.invalidateQueries({ queryKey: ['terceros', { empresaId }] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente-movimientos'] });
    } catch (err) {
      const data = axios.isAxiosError(err) ? (err.response?.data as { message?: string; errores?: FilaConError[] }) : undefined;
      if (data?.errores?.length) {
        setImportErrores(data.errores);
        setImportErrorGeneral(data.message ?? null);
      } else {
        setImportErrorGeneral(apiErrorMessage(err));
      }
    } finally {
      setImportando(false);
    }
  }

  const importDialogOpen = importando || Boolean(importResultado) || Boolean(importErrores) || Boolean(importErrorGeneral);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{cfg.titulo}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDescargarPlantilla} disabled={descargandoPlantilla}>
            {descargandoPlantilla ? 'Generando…' : 'Descargar plantilla de saldos'}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importando}>
            {importando ? 'Importando…' : 'Importar saldos iniciales'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleArchivoSeleccionado}
          />
        </div>
      </div>

      {tipo === 'CLIENTE' && facturasVencidas && facturasVencidas.length > 0 && (
        <Card>
          <CardHeader
            title="Facturas vencidas"
            subtitle={`${facturasVencidas.length} factura${facturasVencidas.length === 1 ? '' : 's'} a crédito con el plazo cumplido`}
          />
          <Table>
            <Thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Factura</Th>
                <Th>Vencimiento</Th>
                <Th className="text-right">Días vencido</Th>
                <Th className="text-right">Saldo pendiente</Th>
              </tr>
            </Thead>
            <tbody>
              {facturasVencidas.map((f) => (
                <Tr key={f.id} onClick={() => seleccionarPorClienteId(f.cliente.id)}>
                  <Td className="font-medium text-ink-900">{f.cliente.razonSocial}</Td>
                  <Td className="text-ink-500">Nº {f.numero}</Td>
                  <Td className="text-ink-500">{formatDate(f.fechaVencimiento)}</Td>
                  <Td className="text-right tabular-nums">
                    <Badge tone="warning">{f.diasVencido} días</Badge>
                  </Td>
                  <Td className="text-right tabular-nums font-medium">{formatGs(f.saldoPendiente)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title={cfg.tituloLista} />
          <div className="border-b border-ink-100 p-3">
            <Input placeholder={cfg.placeholderBusqueda} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loadingTerceros ? (
            <PageSpinner />
          ) : !terceros || terceros.length === 0 ? (
            <EmptyState message={cfg.mensajeVacio} />
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {terceros.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSeleccionado(t)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                      seleccionado?.id === t.id ? 'bg-brand-50' : 'hover:bg-ink-50'
                    }`}
                  >
                    <span className="font-medium text-ink-900">{t.razonSocial}</span>
                    <span className="text-xs text-ink-400">{t.numeroDocumento}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!seleccionado ? (
          <Card className="flex h-64 items-center justify-center">
            <p className="text-sm text-ink-400">{cfg.mensajeSinSeleccion}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{seleccionado.razonSocial}</h2>
                  <p className="text-sm text-ink-500">{seleccionado.numeroDocumento}</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>{cfg.botonAccion}</Button>
              </div>
              <div className="mt-5 flex gap-8">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Saldo</p>
                  {loadingCuenta ? (
                    <SaldoSkeleton />
                  ) : (
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">
                      {cuenta ? formatGs(cuenta.saldo) : '—'}
                    </p>
                  )}
                </div>
                {cuenta?.limiteCredito && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Límite de crédito</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-400">
                      {formatGs(cuenta.limiteCredito)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Movimientos" />
              {loadingMovimientos ? (
                <PageSpinner />
              ) : !movimientos || movimientos.length === 0 ? (
                <EmptyState message="Sin movimientos todavía." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Concepto</Th>
                      <Th>Tipo</Th>
                      <Th className="text-right">Monto</Th>
                      <Th className="text-right">Saldo</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <Tr key={m.id}>
                        <Td className="text-ink-500">{formatDateTime(m.fecha)}</Td>
                        <Td className="text-ink-800">{m.concepto}</Td>
                        <Td>
                          <Badge tone={m.tipo === 'DEBITO' ? cfg.toneDebito : cfg.toneCredito}>
                            {m.tipo === 'DEBITO' ? 'Debe' : 'Haber'}
                          </Badge>
                        </Td>
                        <Td className="text-right tabular-nums">{formatGs(m.monto)}</Td>
                        <Td className="text-right tabular-nums font-medium">{formatGs(m.saldoNuevo)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        )}
      </div>

      {seleccionado && tipo === 'CLIENTE' && (
        <ReciboFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tercero={seleccionado} />
      )}
      {seleccionado && tipo === 'PROVEEDOR' && (
        <OrdenPagoFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} proveedor={seleccionado} />
      )}

      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportResultado(null);
          setImportErrores(null);
          setImportErrorGeneral(null);
        }}
        title="Importar saldos iniciales desde Excel"
        width={importErrores ? 'lg' : 'sm'}
      >
        {importando ? (
          <PageSpinner />
        ) : importResultado ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
            <p className="text-sm text-ink-700">
              Se {importResultado.creados === 1 ? 'cargó' : 'cargaron'}{' '}
              <span className="font-semibold text-ink-900">{importResultado.creados}</span>{' '}
              {importResultado.creados === 1 ? 'saldo inicial' : 'saldos iniciales'} correctamente.
            </p>
          </div>
        ) : importErrores ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-700">
              {importErrorGeneral ?? 'Hay errores en el archivo.'} No se cargó ningún saldo todavía.
            </p>
            <Table>
              <Thead>
                <tr>
                  <Th>Fila</Th>
                  <Th>Error</Th>
                </tr>
              </Thead>
              <tbody>
                {importErrores.map((e) => (
                  <Tr key={e.fila}>
                    <Td className="tabular-nums">{e.fila}</Td>
                    <Td className="text-ink-700">{e.mensaje}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-red-700">{importErrorGeneral}</p>
        )}
      </Dialog>
    </div>
  );
}

function SaldoSkeleton() {
  return <div className="mt-2 h-8 w-24 animate-pulse rounded bg-ink-100" />;
}
