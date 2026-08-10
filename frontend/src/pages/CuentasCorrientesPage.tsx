import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useDebouncedValue, useEmpresaId } from '../lib/hooks';
import { formatDateTime, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { ReciboFormDialog } from './ReciboFormDialog';
import { OrdenPagoFormDialog } from './OrdenPagoFormDialog';
import type { CuentaCorriente, MovimientoCuentaCorriente, Tercero, TipoTercero } from '../lib/types';

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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [seleccionado, setSeleccionado] = useState<Tercero | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">{cfg.titulo}</h1>

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
    </div>
  );
}

function SaldoSkeleton() {
  return <div className="mt-2 h-8 w-24 animate-pulse rounded bg-ink-100" />;
}
