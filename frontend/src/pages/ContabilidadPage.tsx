import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { NuevoAsientoDialog } from './NuevoAsientoDialog';
import type {
  AsientoContable,
  BalanceSumasSaldos,
  CuentaContable,
  LibroMayor,
  MapeoContable,
  RolCuenta,
} from '../lib/types';

function primerDiaDelMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

const ORIGEN_LABEL: Record<string, string> = { MANUAL: 'Manual', VENTA: 'Venta', COBRO: 'Cobro' };

const TABS = [
  { id: 'plan', label: 'Plan de Cuentas' },
  { id: 'diario', label: 'Libro Diario' },
  { id: 'mayor', label: 'Libro Mayor' },
  { id: 'balance', label: 'Balance de Sumas y Saldos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ContabilidadPage() {
  const [tab, setTab] = useState<TabId>('plan');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Contabilidad</h1>

      <div className="flex gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && <PlanDeCuentasTab />}
      {tab === 'diario' && <LibroDiarioTab />}
      {tab === 'mayor' && <LibroMayorTab />}
      {tab === 'balance' && <BalanceTab />}
    </div>
  );
}

function PlanDeCuentasTab() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: cuentas, isLoading } = useQuery({
    queryKey: ['cuentas-contables', empresaId],
    queryFn: async () => (await api.get<CuentaContable[]>('/cuentas-contables', { params: { empresaId } })).data,
  });

  const { data: roles } = useQuery({
    queryKey: ['cuentas-contables-roles'],
    queryFn: async () => (await api.get<Record<RolCuenta, string>>('/cuentas-contables/roles')).data,
  });

  const { data: mapeo } = useQuery({
    queryKey: ['mapeo-contable', empresaId],
    queryFn: async () => (await api.get<MapeoContable>('/cuentas-contables/mapeo', { params: { empresaId } })).data,
    enabled: !!cuentas && cuentas.length > 0,
  });

  const sembrar = useMutation({
    mutationFn: () => api.post('/cuentas-contables/sembrar-plan-estandar', null, { params: { empresaId } }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['mapeo-contable', empresaId] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const actualizarMapeo = useMutation({
    mutationFn: (nuevoMapeo: MapeoContable) => api.put('/cuentas-contables/mapeo', { mapeo: nuevoMapeo }, { params: { empresaId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mapeo-contable', empresaId] }),
  });

  if (isLoading) return <PageSpinner />;

  if (!cuentas || cuentas.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 px-5 py-10 text-center">
          <p className="text-sm text-ink-600">
            Todavía no cargaste un Plan de Cuentas para esta empresa. Podés empezar con el modelo estándar de la DNIT
            (el mismo que usa el formulario oficial de Estados Financieros).
          </p>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Button onClick={() => sembrar.mutate()} disabled={sembrar.isPending}>
            {sembrar.isPending ? 'Generando…' : 'Sembrar Plan de Cuentas estándar'}
          </Button>
        </div>
      </Card>
    );
  }

  const cuentasImputables = cuentas.filter((c) => c.imputable);

  return (
    <div className="flex flex-col gap-6">
      {roles && mapeo && (
        <Card>
          <CardHeader
            title="Mapeo de cuentas para asientos automáticos"
            subtitle="Qué cuenta usar en cada venta o cobro. Podés ajustarlo cuando quieras."
          />
          <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
            {(Object.keys(roles) as RolCuenta[]).map((rol) => (
              <label key={rol} className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{roles[rol]}</span>
                <Select
                  value={mapeo[rol] ?? ''}
                  onChange={(e) => actualizarMapeo.mutate({ ...mapeo, [rol]: e.target.value || undefined })}
                >
                  <option value="">Sin asignar</option>
                  {cuentasImputables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} {c.nombre}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Plan de Cuentas" subtitle={`${cuentas.length} cuentas`} />
        <Table>
          <Thead>
            <tr>
              <Th>Código</Th>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Naturaleza</Th>
            </tr>
          </Thead>
          <tbody>
            {cuentas.map((c) => {
              const nivel = (c.codigo.match(/-/g)?.length ?? 1) - 1;
              return (
                <Tr key={c.id}>
                  <Td className="font-mono text-xs text-ink-500">{c.codigo}</Td>
                  <Td className={c.imputable ? 'text-ink-900' : 'font-semibold text-ink-700'}>
                    <span style={{ marginLeft: `${nivel * 16}px` }}>{c.nombre}</span>
                  </Td>
                  <Td className="text-ink-500">{c.tipo}</Td>
                  <Td className="text-ink-500">{c.naturaleza}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function LibroDiarioTab() {
  const empresaId = useEmpresaId();
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoy());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const { data: cuentas } = useQuery({
    queryKey: ['cuentas-contables', empresaId],
    queryFn: async () => (await api.get<CuentaContable[]>('/cuentas-contables', { params: { empresaId } })).data,
  });

  const { data: asientos, isLoading } = useQuery({
    queryKey: ['asientos-contables', { empresaId, desde, hasta }],
    queryFn: async () => (await api.get<AsientoContable[]>('/asientos-contables', { params: { empresaId, desde, hasta } })).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Desde</span>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Hasta</span>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </label>
          <Button className="ml-auto" onClick={() => setDialogOpen(true)} disabled={!cuentas || cuentas.filter((c) => c.imputable).length === 0}>
            Nuevo asiento
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <PageSpinner />
        ) : !asientos || asientos.length === 0 ? (
          <EmptyState message="No hay asientos registrados en este rango." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Nº</Th>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th>Origen</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </Thead>
            <tbody>
              {asientos.map((a) => {
                const total = a.detalles.reduce((s, d) => s + Number(d.debe), 0);
                const abierto = expandido === a.id;
                return (
                  <Fragment key={a.id}>
                    <Tr onClick={() => setExpandido(abierto ? null : a.id)}>
                      <Td className="font-mono text-ink-900">{a.numero}</Td>
                      <Td className="text-ink-500">{formatDate(a.fecha)}</Td>
                      <Td className="font-medium text-ink-900">{a.concepto}</Td>
                      <Td>
                        <Badge tone={a.origen === 'MANUAL' ? 'neutral' : 'success'}>{ORIGEN_LABEL[a.origen]}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{formatGs(total)}</Td>
                    </Tr>
                    {abierto && (
                      <tr>
                        <td colSpan={5} className="bg-ink-50 px-5 py-3">
                          <table className="w-full text-sm">
                            <tbody>
                              {a.detalles.map((d) => (
                                <tr key={d.id}>
                                  <td className="py-1 text-ink-600">
                                    {d.cuenta?.codigo} {d.cuenta?.nombre}
                                    {d.glosa && <span className="text-ink-400"> — {d.glosa}</span>}
                                  </td>
                                  <td className="py-1 text-right tabular-nums text-ink-900">
                                    {Number(d.debe) > 0 ? formatGs(d.debe) : ''}
                                  </td>
                                  <td className="py-1 text-right tabular-nums text-ink-900">
                                    {Number(d.haber) > 0 ? formatGs(d.haber) : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {cuentas && <NuevoAsientoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} empresaId={empresaId} cuentas={cuentas} />}
    </div>
  );
}

function LibroMayorTab() {
  const empresaId = useEmpresaId();
  const [cuentaId, setCuentaId] = useState('');
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoy());

  const { data: cuentas } = useQuery({
    queryKey: ['cuentas-contables', empresaId],
    queryFn: async () => (await api.get<CuentaContable[]>('/cuentas-contables', { params: { empresaId } })).data,
  });

  const { data: libroMayor, isLoading } = useQuery({
    queryKey: ['libro-mayor', { empresaId, cuentaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<LibroMayor>(`/asientos-contables/libro-mayor/${cuentaId}`, { params: { empresaId, desde, hasta } })).data,
    enabled: !!cuentaId,
  });

  const cuentasImputables = cuentas?.filter((c) => c.imputable) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Cuenta</span>
            <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-80">
              <option value="">Elegir cuenta…</option>
              {cuentasImputables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} {c.nombre}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Desde</span>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Hasta</span>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </label>
        </div>
      </Card>

      {!cuentaId ? (
        <Card>
          <EmptyState message="Elegí una cuenta para ver su Libro Mayor." />
        </Card>
      ) : isLoading ? (
        <PageSpinner />
      ) : !libroMayor || libroMayor.movimientos.length === 0 ? (
        <Card>
          <EmptyState message="No hay movimientos para esta cuenta en el rango elegido." />
        </Card>
      ) : (
        <Card>
          <Table>
            <Thead>
              <tr>
                <Th>Nº</Th>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th className="text-right">Debe</Th>
                <Th className="text-right">Haber</Th>
                <Th className="text-right">Saldo</Th>
              </tr>
            </Thead>
            <tbody>
              {libroMayor.movimientos.map((m) => (
                <Tr key={m.asientoId + m.numero}>
                  <Td className="font-mono text-ink-500">{m.numero}</Td>
                  <Td className="text-ink-500">{formatDate(m.fecha)}</Td>
                  <Td className="text-ink-900">
                    {m.concepto}
                    {m.glosa && <span className="text-ink-400"> — {m.glosa}</span>}
                  </Td>
                  <Td className="text-right tabular-nums">{m.debe > 0 ? formatGs(m.debe) : ''}</Td>
                  <Td className="text-right tabular-nums">{m.haber > 0 ? formatGs(m.haber) : ''}</Td>
                  <Td className="text-right font-medium tabular-nums text-ink-900">{formatGs(m.saldo)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function BalanceTab() {
  const empresaId = useEmpresaId();
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoy());

  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance-sumas-saldos', { empresaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<BalanceSumasSaldos>('/asientos-contables/balance-sumas-saldos', { params: { empresaId, desde, hasta } })).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Desde</span>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Hasta</span>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </label>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <PageSpinner />
        ) : !balance || balance.filas.length === 0 ? (
          <EmptyState message="No hay movimientos contables en este rango." />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Cuenta</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Debe</Th>
                  <Th className="text-right">Haber</Th>
                  <Th className="text-right">Saldo</Th>
                </tr>
              </Thead>
              <tbody>
                {balance.filas.map((f) => (
                  <Tr key={f.cuentaId}>
                    <Td className="font-mono text-xs text-ink-500">{f.codigo}</Td>
                    <Td className="text-ink-900">{f.nombre}</Td>
                    <Td className="text-ink-500">{f.tipo}</Td>
                    <Td className="text-right tabular-nums">{formatGs(f.debe)}</Td>
                    <Td className="text-right tabular-nums">{formatGs(f.haber)}</Td>
                    <Td className="text-right font-medium tabular-nums text-ink-900">{formatGs(f.saldo)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="flex justify-end gap-6 border-t border-ink-100 px-5 py-3 text-sm">
              <span className="text-ink-500">
                Total Debe: <span className="font-semibold text-ink-900">{formatGs(balance.totales.debe)}</span>
              </span>
              <span className="text-ink-500">
                Total Haber: <span className="font-semibold text-ink-900">{formatGs(balance.totales.haber)}</span>
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
