import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { NuevoAsientoDialog } from './NuevoAsientoDialog';
import { NuevaCuentaContableDialog } from './NuevaCuentaContableDialog';
import type {
  AsientoContable,
  BalanceSumasSaldos,
  CuentaContable,
  EstadoResultados,
  EstadoSituacionFinanciera,
  GrupoResultado,
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

const ORIGEN_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  VENTA: 'Venta',
  COBRO: 'Cobro',
  COMPRA: 'Compra',
  PAGO: 'Pago',
};

const TABS = [
  { id: 'plan', label: 'Plan de Cuentas' },
  { id: 'resultados', label: 'Estado de Resultados' },
  { id: 'situacion', label: 'Situación Financiera' },
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
      {tab === 'resultados' && <EstadoResultadosTab />}
      {tab === 'situacion' && <EstadoSituacionFinancieraTab />}
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
  const [nuevaCuentaOpen, setNuevaCuentaOpen] = useState(false);

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
      <CierreContableCard empresaId={empresaId} />

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
        <CardHeader
          title="Plan de Cuentas"
          subtitle={`${cuentas.length} cuentas`}
          actions={<Button onClick={() => setNuevaCuentaOpen(true)}>Nueva cuenta</Button>}
        />
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

      <NuevaCuentaContableDialog
        open={nuevaCuentaOpen}
        onClose={() => setNuevaCuentaOpen(false)}
        empresaId={empresaId}
        cuentas={cuentas}
      />
    </div>
  );
}

function CierreContableCard({ empresaId }: { empresaId: string }) {
  const { esAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: cierre } = useQuery({
    queryKey: ['cierre-contable', empresaId],
    queryFn: async () =>
      (await api.get<{ fechaCierreContable: string | null }>('/cuentas-contables/cierre', { params: { empresaId } })).data,
  });

  const actualizar = useMutation({
    mutationFn: (fechaCierreContable: string | undefined) =>
      api.put('/cuentas-contables/cierre', { fechaCierreContable }, { params: { empresaId } }),
    onSuccess: () => {
      setError(null);
      setFecha('');
      queryClient.invalidateQueries({ queryKey: ['cierre-contable', empresaId] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader
        title="Cierre de período contable"
        subtitle="Bloquea cargar ventas, compras, cobros, pagos o asientos manuales con fecha igual o anterior a la elegida."
      />
      <div className="flex flex-wrap items-end gap-3 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Cerrado hasta</p>
          <p className="mt-1 text-sm text-ink-900">
            {cierre?.fechaCierreContable ? formatDate(cierre.fechaCierreContable) : 'Sin cierre — todas las fechas abiertas'}
          </p>
        </div>
        {esAdmin && (
          <>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
            <Button variant="secondary" disabled={!fecha || actualizar.isPending} onClick={() => actualizar.mutate(fecha)}>
              Cerrar hasta esta fecha
            </Button>
            {cierre?.fechaCierreContable && (
              <Button variant="ghost" disabled={actualizar.isPending} onClick={() => actualizar.mutate(undefined)}>
                Quitar cierre
              </Button>
            )}
          </>
        )}
      </div>
      {error && <div className="mx-5 mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Card>
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

function primerDiaDelAnio() {
  return `${new Date().getFullYear()}-01-01`;
}

// Fila de un grupo del Estado de Resultados (ej. "Ventas", "Gastos de
// Administración") -- se omite entera si no tiene cuentas con movimiento,
// para no listar secciones vacías.
function GrupoResultadoSection({ grupo, negativo }: { grupo: GrupoResultado; negativo?: boolean }) {
  if (grupo.filas.length === 0) return null;
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">{negativo ? `(-) ${grupo.label}` : grupo.label}</span>
        <span className="tabular-nums font-medium text-ink-900">{formatGs(grupo.total)}</span>
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {grupo.filas.map((f) => (
          <div key={f.cuentaId} className="flex items-center justify-between pl-4 text-xs text-ink-500">
            <span>
              {f.codigo} {f.nombre}
            </span>
            <span className="tabular-nums">{formatGs(f.monto)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubtotalRow({ label, value, final: esFinal }: { label: string; value: number; final?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        esFinal ? 'bg-brand-50 text-brand-900' : 'bg-ink-50 text-ink-900'
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`tabular-nums font-semibold ${value < 0 ? 'text-red-600' : ''}`}>{formatGs(value)}</span>
    </div>
  );
}

function EstadoResultadosTab() {
  const empresaId = useEmpresaId();
  const [desde, setDesde] = useState(primerDiaDelAnio());
  const [hasta, setHasta] = useState(hoy());

  const { data, isLoading } = useQuery({
    queryKey: ['estado-resultados', { empresaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<EstadoResultados>('/asientos-contables/estado-resultados', { params: { empresaId, desde, hasta } })).data,
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
        <CardHeader
          title="Estado de Resultados"
          subtitle={`Por función, ${formatDate(desde)} al ${formatDate(hasta)} — NIIF para PYMES, Sección 5`}
        />
        {isLoading ? (
          <PageSpinner />
        ) : !data ? (
          <EmptyState message="No se pudo calcular el estado de resultados." />
        ) : (
          <div className="divide-y divide-ink-100">
            <GrupoResultadoSection grupo={data.ventas} />
            <GrupoResultadoSection grupo={data.costoVentas} negativo />
            <SubtotalRow label="Utilidad Bruta" value={data.utilidadBruta} />
            <GrupoResultadoSection grupo={data.gastosOperacionales} negativo />
            <GrupoResultadoSection grupo={data.gastosVentas} negativo />
            <GrupoResultadoSection grupo={data.gastosAdministracion} negativo />
            <SubtotalRow label="Utilidad Operativa" value={data.utilidadOperativa} />
            <GrupoResultadoSection grupo={data.otrosIngresos} />
            <GrupoResultadoSection grupo={data.gananciasExtraordinarias} />
            <GrupoResultadoSection grupo={data.otrosGastos} negativo />
            <GrupoResultadoSection grupo={data.gastosFinancieros} negativo />
            <GrupoResultadoSection grupo={data.perdidasExtraordinarias} negativo />
            <SubtotalRow label="Utilidad antes de Impuesto a la Renta" value={data.utilidadAntesImpuesto} />
            <GrupoResultadoSection grupo={data.impuestoRenta} negativo />
            <SubtotalRow label="Utilidad Neta del Ejercicio" value={data.utilidadNeta} final />
          </div>
        )}
      </Card>
    </div>
  );
}

function GrupoBalanceCard({
  titulo,
  grupos,
}: {
  titulo: string;
  grupos: { label: string; grupo: { filas: { cuentaId: string; codigo: string; nombre: string; saldo: number }[]; total: number } }[];
}) {
  const total = grupos.reduce((s, g) => s + g.grupo.total, 0);
  return (
    <Card>
      <CardHeader title={titulo} />
      <div className="divide-y divide-ink-100">
        {grupos.map(
          ({ label, grupo }) =>
            grupo.filas.length > 0 && (
              <div key={label} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-700">{label}</span>
                  <span className="tabular-nums font-medium text-ink-900">{formatGs(grupo.total)}</span>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {grupo.filas.map((f) => (
                    <div key={f.cuentaId} className="flex items-center justify-between pl-4 text-xs text-ink-500">
                      <span>
                        {f.codigo} {f.nombre}
                      </span>
                      <span className="tabular-nums">{formatGs(f.saldo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}
        {grupos.every((g) => g.grupo.filas.length === 0) && <EmptyState message="Sin saldo a esta fecha." />}
      </div>
      <div className="flex items-center justify-between border-t border-ink-200 bg-ink-50 px-5 py-3">
        <span className="text-sm font-semibold text-ink-900">Total {titulo}</span>
        <span className="tabular-nums font-semibold text-ink-900">{formatGs(total)}</span>
      </div>
    </Card>
  );
}

function EstadoSituacionFinancieraTab() {
  const empresaId = useEmpresaId();
  const [fechaCorte, setFechaCorte] = useState(hoy());

  const { data, isLoading } = useQuery({
    queryKey: ['estado-situacion-financiera', { empresaId, fechaCorte }],
    queryFn: async () =>
      (
        await api.get<EstadoSituacionFinanciera>('/asientos-contables/estado-situacion-financiera', {
          params: { empresaId, fechaCorte },
        })
      ).data,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Fecha de corte</span>
            <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} className="w-40" />
          </label>
          <p className="ml-2 text-xs text-ink-400">
            Saldo acumulado de cada cuenta desde el inicio de actividades hasta esta fecha — NIIF para PYMES, Sección 4.
          </p>
        </div>
      </Card>

      {isLoading ? (
        <PageSpinner />
      ) : !data ? (
        <EmptyState message="No se pudo calcular el estado de situación financiera." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GrupoBalanceCard
              titulo="Activo"
              grupos={[
                { label: 'Activo Corriente', grupo: data.activoCorriente },
                { label: 'Activo No Corriente', grupo: data.activoNoCorriente },
              ]}
            />
            <div className="flex flex-col gap-4">
              <GrupoBalanceCard
                titulo="Pasivo"
                grupos={[
                  { label: 'Pasivo Corriente', grupo: data.pasivoCorriente },
                  { label: 'Pasivo No Corriente', grupo: data.pasivoNoCorriente },
                ]}
              />
              <Card>
                <CardHeader title="Patrimonio" />
                <div className="divide-y divide-ink-100">
                  {data.patrimonio.filas.length > 0 && (
                    <div className="px-5 py-3">
                      <div className="mt-1 flex flex-col gap-0.5">
                        {data.patrimonio.filas.map((f) => (
                          <div key={f.cuentaId} className="flex items-center justify-between text-xs text-ink-500">
                            <span>
                              {f.codigo} {f.nombre}
                            </span>
                            <span className="tabular-nums">{formatGs(f.saldo)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span>Resultado del ejercicio (calculado, no contabilizado)</span>
                      <span className="tabular-nums">{formatGs(data.resultadoDelEjercicio)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-ink-200 bg-ink-50 px-5 py-3">
                  <span className="text-sm font-semibold text-ink-900">Total Patrimonio</span>
                  <span className="tabular-nums font-semibold text-ink-900">{formatGs(data.totalPatrimonio)}</span>
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex gap-6 text-sm">
                <span className="text-ink-500">
                  Total Activo: <span className="font-semibold text-ink-900">{formatGs(data.totalActivo)}</span>
                </span>
                <span className="text-ink-500">
                  Total Pasivo + Patrimonio:{' '}
                  <span className="font-semibold text-ink-900">{formatGs(data.totalPasivoYPatrimonio)}</span>
                </span>
              </div>
              <Badge tone={data.diferencia === 0 ? 'success' : 'danger'}>
                {data.diferencia === 0 ? 'Cuadra' : `No cuadra — diferencia ${formatGs(data.diferencia)}`}
              </Badge>
            </div>
          </Card>
        </>
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
