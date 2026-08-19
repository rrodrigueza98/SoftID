import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatGs, formatDate, periodoLabel } from '../lib/format';
import type { DeclaracionF120, RetencionIva, TipoRetencionIva } from '../lib/types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { Table, Thead, Th, Td, Tr, EmptyState } from '../components/ui/Table';
import { PageSpinner } from '../components/ui/Spinner';

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

const TABS = [
  { id: 'declaraciones', label: 'Declaraciones' },
  { id: 'retenciones', label: 'Retenciones' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function F120Page() {
  const [tab, setTab] = useState<TabId>('declaraciones');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Formulario 120 (IVA General)</h1>

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

      {tab === 'declaraciones' && <DeclaracionesTab />}
      {tab === 'retenciones' && <RetencionesTab />}
    </div>
  );
}

const AJUSTES_VACIOS = {
  saldoTecnicoRemitidoFisco: '',
  deduccionDiscapacidad: '',
  multa: '',
  rubro2MercadoInternoOverride: '',
  rubro2AgricolaOverride: '',
  rubro2ExoneradaOverride: '',
};

function DeclaracionesTab() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState(periodoActual());
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [ajustes, setAjustes] = useState(AJUSTES_VACIOS);
  const [error, setError] = useState<string | null>(null);

  const { data: declaraciones, isLoading } = useQuery({
    queryKey: ['f120', empresaId],
    queryFn: async () => (await api.get<DeclaracionF120[]>('/f120', { params: { empresaId } })).data,
  });

  const generar = useMutation({
    mutationFn: () =>
      api.post('/f120/generar', {
        empresaId,
        periodoTributario: periodo,
        saldoTecnicoRemitidoFisco: ajustes.saldoTecnicoRemitidoFisco ? Number(ajustes.saldoTecnicoRemitidoFisco) : undefined,
        deduccionDiscapacidad: ajustes.deduccionDiscapacidad ? Number(ajustes.deduccionDiscapacidad) : undefined,
        multa: ajustes.multa ? Number(ajustes.multa) : undefined,
        rubro2MercadoInternoOverride: ajustes.rubro2MercadoInternoOverride ? Number(ajustes.rubro2MercadoInternoOverride) : undefined,
        rubro2AgricolaOverride: ajustes.rubro2AgricolaOverride ? Number(ajustes.rubro2AgricolaOverride) : undefined,
        rubro2ExoneradaOverride: ajustes.rubro2ExoneradaOverride ? Number(ajustes.rubro2ExoneradaOverride) : undefined,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['f120'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const anular = useMutation({
    mutationFn: (id: string) => api.patch(`/f120/${id}/anular`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['f120'] }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Generar declaración"
          subtitle="Calcula los Rubros 1 a 6 a partir de las ventas, compras y retenciones cargadas en el período"
        />
        <div className="flex flex-col gap-4 px-5 py-4">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Período tributario" required>
              <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-40" />
            </FormField>
            <Button onClick={() => generar.mutate()} disabled={generar.isPending}>
              {generar.isPending ? 'Generando…' : 'Generar / recalcular'}
            </Button>
            <button
              type="button"
              className="text-xs font-medium text-brand-700 underline decoration-dotted"
              onClick={() => setMostrarAjustes((v) => !v)}
            >
              {mostrarAjustes ? 'Ocultar ajustes avanzados' : 'Ajustes avanzados (opcional)'}
            </button>
          </div>

          {mostrarAjustes && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-ink-200 bg-ink-50 p-4 md:grid-cols-4">
              <FormField label="Remisión voluntaria al fisco (casilla 167)">
                <Input
                  type="number"
                  min="0"
                  value={ajustes.saldoTecnicoRemitidoFisco}
                  onChange={(e) => setAjustes({ ...ajustes, saldoTecnicoRemitidoFisco: e.target.value })}
                />
              </FormField>
              <FormField label="Deducción discapacidad (casilla 168)">
                <Input
                  type="number"
                  min="0"
                  value={ajustes.deduccionDiscapacidad}
                  onChange={(e) => setAjustes({ ...ajustes, deduccionDiscapacidad: e.target.value })}
                />
              </FormField>
              <FormField label="Multa por mora (casilla 56)">
                <Input type="number" min="0" value={ajustes.multa} onChange={(e) => setAjustes({ ...ajustes, multa: e.target.value })} />
              </FormField>
              <div className="col-span-full mt-1 border-t border-ink-200 pt-3 text-xs font-medium uppercase tracking-wide text-ink-500">
                Rubro 2 — ventas últimos 6 meses (solo si todavía no hay 6 períodos cargados en el sistema)
              </div>
              <FormField label="Mercado interno no agrícola (casilla 160)">
                <Input
                  type="number"
                  min="0"
                  value={ajustes.rubro2MercadoInternoOverride}
                  onChange={(e) => setAjustes({ ...ajustes, rubro2MercadoInternoOverride: e.target.value })}
                  placeholder="Calculado automáticamente"
                />
              </FormField>
              <FormField label="Agrícola en estado natural (casilla 161)">
                <Input
                  type="number"
                  min="0"
                  value={ajustes.rubro2AgricolaOverride}
                  onChange={(e) => setAjustes({ ...ajustes, rubro2AgricolaOverride: e.target.value })}
                  placeholder="Calculado automáticamente"
                />
              </FormField>
              <FormField label="Exonerada / no alcanzada (casilla 26)">
                <Input
                  type="number"
                  min="0"
                  value={ajustes.rubro2ExoneradaOverride}
                  onChange={(e) => setAjustes({ ...ajustes, rubro2ExoneradaOverride: e.target.value })}
                  placeholder="Calculado automáticamente"
                />
              </FormField>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Historial de declaraciones" />
        {isLoading ? (
          <PageSpinner />
        ) : !declaraciones || declaraciones.length === 0 ? (
          <EmptyState message="Todavía no generaste ninguna declaración." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Período</Th>
                <Th className="text-right">IVA débito</Th>
                <Th className="text-right">IVA crédito</Th>
                <Th className="text-right">Saldo a favor</Th>
                <Th className="text-right">Saldo a pagar</Th>
                <Th>Estado</Th>
                <Th>&nbsp;</Th>
              </tr>
            </Thead>
            <tbody>
              {declaraciones.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium text-ink-900">{periodoLabel(d.periodoTributario)}</Td>
                  <Td className="text-right tabular-nums">{formatGs(d.ivaDebito)}</Td>
                  <Td className="text-right tabular-nums">{formatGs(d.ivaCredito)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatGs(d.saldoFinancieroFavorContrib)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatGs(d.saldoAPagarFisco)}</Td>
                  <Td>
                    <Badge tone={d.estado === 'GENERADA' ? 'success' : 'neutral'}>{d.estado}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/imprimir/f120/${d.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="secondary">
                          Ver / imprimir
                        </Button>
                      </Link>
                      {d.estado === 'GENERADA' && (
                        <Button size="sm" variant="ghost" disabled={anular.isPending} onClick={() => anular.mutate(d.id)}>
                          Anular
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

const TIPOS_RETENCION: { value: TipoRetencionIva; label: string }[] = [
  { value: 'IVA', label: 'Retención de IVA' },
  { value: 'PERCEPCION_IVA', label: 'Percepción de IVA' },
];

const emptyRetencionForm = {
  tipo: 'IVA' as TipoRetencionIva,
  fecha: new Date().toISOString().slice(0, 10),
  periodoTributario: periodoActual(),
  agenteRetentorRuc: '',
  agenteRetentorNombre: '',
  numeroComprobanteRetencion: '',
  monto: '',
  observacion: '',
};

function RetencionesTab() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState(periodoActual());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRetencionForm);
  const [error, setError] = useState<string | null>(null);

  const { data: retenciones, isLoading } = useQuery({
    queryKey: ['retenciones-iva', { empresaId, periodo }],
    queryFn: async () =>
      (await api.get<RetencionIva[]>('/retenciones-iva', { params: { empresaId, periodoTributario: periodo } })).data,
  });

  const crear = useMutation({
    mutationFn: () =>
      api.post('/retenciones-iva', {
        empresaId,
        tipo: form.tipo,
        fecha: form.fecha,
        periodoTributario: form.periodoTributario,
        agenteRetentorRuc: form.agenteRetentorRuc,
        agenteRetentorNombre: form.agenteRetentorNombre,
        numeroComprobanteRetencion: form.numeroComprobanteRetencion || undefined,
        monto: Number(form.monto),
        observacion: form.observacion || undefined,
      }),
    onSuccess: () => {
      setDialogOpen(false);
      setForm(emptyRetencionForm);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['retenciones-iva'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/retenciones-iva/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retenciones-iva'] }),
  });

  const totalIva = (retenciones ?? []).filter((r) => r.tipo === 'IVA').reduce((s, r) => s + Number(r.monto), 0);
  const totalPercepcion = (retenciones ?? []).filter((r) => r.tipo === 'PERCEPCION_IVA').reduce((s, r) => s + Number(r.monto), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <FormField label="Período tributario">
            <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-40" />
          </FormField>
          <div className="ml-2 flex gap-6 text-sm text-ink-500">
            <span>
              Retenciones IVA: <span className="font-semibold text-ink-900 tabular-nums">{formatGs(totalIva)}</span>
            </span>
            <span>
              Percepciones IVA: <span className="font-semibold text-ink-900 tabular-nums">{formatGs(totalPercepcion)}</span>
            </span>
          </div>
          <Button
            className="ml-auto"
            onClick={() => {
              setForm({ ...emptyRetencionForm, periodoTributario: periodo });
              setDialogOpen(true);
            }}
          >
            Nueva retención
          </Button>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <PageSpinner />
        ) : !retenciones || retenciones.length === 0 ? (
          <EmptyState message="No hay retenciones cargadas para este período." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tipo</Th>
                <Th>Agente retentor</Th>
                <Th>Comprobante</Th>
                <Th className="text-right">Monto</Th>
                <Th>&nbsp;</Th>
              </tr>
            </Thead>
            <tbody>
              {retenciones.map((r) => (
                <Tr key={r.id}>
                  <Td className="text-ink-500">{formatDate(r.fecha)}</Td>
                  <Td>
                    <Badge tone={r.tipo === 'IVA' ? 'brand' : 'neutral'}>
                      {r.tipo === 'IVA' ? 'Retención' : 'Percepción'}
                    </Badge>
                  </Td>
                  <Td className="text-ink-900">
                    {r.agenteRetentorNombre}
                    <span className="text-ink-400"> — {r.agenteRetentorRuc}</span>
                  </Td>
                  <Td className="text-ink-500">{r.numeroComprobanteRetencion || '—'}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatGs(r.monto)}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => eliminar.mutate(r.id)} disabled={eliminar.isPending}>
                      Eliminar
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Nueva retención / percepción">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate();
          }}
        >
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormField label="Tipo" required>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoRetencionIva })}>
              {TIPOS_RETENCION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fecha" required>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </FormField>
            <FormField label="Período tributario" required>
              <Input
                type="month"
                value={form.periodoTributario}
                onChange={(e) => setForm({ ...form, periodoTributario: e.target.value })}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="RUC del agente retentor" required>
              <Input
                value={form.agenteRetentorRuc}
                onChange={(e) => setForm({ ...form, agenteRetentorRuc: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Nombre del agente retentor" required>
              <Input
                value={form.agenteRetentorNombre}
                onChange={(e) => setForm({ ...form, agenteRetentorNombre: e.target.value })}
                required
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="N° de comprobante de retención">
              <Input
                value={form.numeroComprobanteRetencion}
                onChange={(e) => setForm({ ...form, numeroComprobanteRetencion: e.target.value })}
              />
            </FormField>
            <FormField label="Monto" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
              />
            </FormField>
          </div>
          <FormField label="Observación">
            <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
