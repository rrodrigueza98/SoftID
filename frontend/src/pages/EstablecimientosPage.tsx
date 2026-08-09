import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaId } from '../lib/hooks';
import { formatDate } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { TIPO_DOCUMENTO_LABEL } from './comprobante-labels';
import type { Establecimiento, PuntoExpedicion, Timbrado, TipoDocumentoElectronico } from '../lib/types';

const TIPOS_DOCUMENTO = (
  ['FACTURA_ELECTRONICA', 'NOTA_CREDITO_ELECTRONICA', 'NOTA_DEBITO_ELECTRONICA', 'AUTOFACTURA_ELECTRONICA', 'NOTA_REMISION_ELECTRONICA'] as TipoDocumentoElectronico[]
).map((value) => ({ value, label: TIPO_DOCUMENTO_LABEL[value] }));

const emptyEstablecimientoForm = {
  codigo: '',
  nombre: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  telefono: '',
  email: '',
  esCasaMatriz: false,
};

const emptyPuntoExpedicionForm = { codigo: '', descripcion: '' };

const emptyTimbradoForm = {
  numeroTimbrado: '',
  tipoDocumento: 'FACTURA_ELECTRONICA' as TipoDocumentoElectronico,
  esElectronico: true,
  numeroDesde: '1',
  numeroHasta: '9999999',
  fechaInicioVigencia: new Date().toISOString().slice(0, 10),
  fechaFinVigencia: '',
};

export default function EstablecimientosPage() {
  const { esAdmin } = useAuth();
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();

  const [establecimientoId, setEstablecimientoId] = useState<string | null>(null);
  const [puntoExpedicionId, setPuntoExpedicionId] = useState<string | null>(null);

  // --- Establecimientos ---
  const [estOpen, setEstOpen] = useState(false);
  const [estEditandoId, setEstEditandoId] = useState<string | null>(null);
  const [estForm, setEstForm] = useState(emptyEstablecimientoForm);
  const [estError, setEstError] = useState<string | null>(null);

  const { data: establecimientos, isLoading: cargandoEstablecimientos } = useQuery({
    queryKey: ['establecimientos', empresaId],
    queryFn: async () => (await api.get<Establecimiento[]>('/establecimientos', { params: { empresaId } })).data,
  });

  const estMutation = useMutation({
    mutationFn: () => {
      const payload = { ...estForm, empresaId };
      return estEditandoId ? api.patch(`/establecimientos/${estEditandoId}`, payload) : api.post('/establecimientos', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establecimientos', empresaId] });
      setEstOpen(false);
      setEstError(null);
    },
    onError: (err) => setEstError(apiErrorMessage(err)),
  });

  const estToggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => api.patch(`/establecimientos/${id}`, { activo: !activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['establecimientos', empresaId] }),
  });

  function abrirNuevoEstablecimiento() {
    setEstEditandoId(null);
    setEstForm(emptyEstablecimientoForm);
    setEstError(null);
    setEstOpen(true);
  }
  function abrirEdicionEstablecimiento(e: Establecimiento) {
    setEstEditandoId(e.id);
    setEstForm({
      codigo: e.codigo,
      nombre: e.nombre,
      direccion: e.direccion ?? '',
      ciudad: e.ciudad ?? '',
      departamento: e.departamento ?? '',
      telefono: e.telefono ?? '',
      email: e.email ?? '',
      esCasaMatriz: e.esCasaMatriz,
    });
    setEstError(null);
    setEstOpen(true);
  }

  // --- Puntos de expedición ---
  const [peOpen, setPeOpen] = useState(false);
  const [peEditandoId, setPeEditandoId] = useState<string | null>(null);
  const [peForm, setPeForm] = useState(emptyPuntoExpedicionForm);
  const [peError, setPeError] = useState<string | null>(null);

  const establecimientoSeleccionado = establecimientos?.find((e) => e.id === establecimientoId);

  const { data: puntosExpedicion, isLoading: cargandoPuntosExpedicion } = useQuery({
    queryKey: ['puntos-expedicion', establecimientoId],
    queryFn: async () => (await api.get<PuntoExpedicion[]>('/puntos-expedicion', { params: { establecimientoId } })).data,
    enabled: Boolean(establecimientoId),
  });

  const peMutation = useMutation({
    mutationFn: () => {
      const payload = { ...peForm, establecimientoId };
      return peEditandoId ? api.patch(`/puntos-expedicion/${peEditandoId}`, payload) : api.post('/puntos-expedicion', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntos-expedicion', establecimientoId] });
      setPeOpen(false);
      setPeError(null);
    },
    onError: (err) => setPeError(apiErrorMessage(err)),
  });

  const peToggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => api.patch(`/puntos-expedicion/${id}`, { activo: !activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['puntos-expedicion', establecimientoId] }),
  });

  function abrirNuevoPuntoExpedicion() {
    setPeEditandoId(null);
    setPeForm(emptyPuntoExpedicionForm);
    setPeError(null);
    setPeOpen(true);
  }
  function abrirEdicionPuntoExpedicion(p: PuntoExpedicion) {
    setPeEditandoId(p.id);
    setPeForm({ codigo: p.codigo, descripcion: p.descripcion });
    setPeError(null);
    setPeOpen(true);
  }

  // --- Timbrados ---
  const [tOpen, setTOpen] = useState(false);
  const [tEditandoId, setTEditandoId] = useState<string | null>(null);
  const [tForm, setTForm] = useState(emptyTimbradoForm);
  const [tError, setTError] = useState<string | null>(null);

  const puntoExpedicionSeleccionado = puntosExpedicion?.find((p) => p.id === puntoExpedicionId);

  const { data: timbrados, isLoading: cargandoTimbrados } = useQuery({
    queryKey: ['timbrados', puntoExpedicionId],
    queryFn: async () => (await api.get<Timbrado[]>('/timbrados', { params: { puntoExpedicionId } })).data,
    enabled: Boolean(puntoExpedicionId),
  });

  const tMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...tForm,
        numeroDesde: Number(tForm.numeroDesde),
        numeroHasta: Number(tForm.numeroHasta),
        fechaInicioVigencia: new Date(tForm.fechaInicioVigencia).toISOString(),
        fechaFinVigencia: tForm.fechaFinVigencia ? new Date(tForm.fechaFinVigencia).toISOString() : undefined,
        puntoExpedicionId,
      };
      return tEditandoId ? api.patch(`/timbrados/${tEditandoId}`, payload) : api.post('/timbrados', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timbrados', puntoExpedicionId] });
      setTOpen(false);
      setTError(null);
    },
    onError: (err) => setTError(apiErrorMessage(err)),
  });

  const tToggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => api.patch(`/timbrados/${id}`, { activo: !activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timbrados', puntoExpedicionId] }),
  });

  function abrirNuevoTimbrado() {
    setTEditandoId(null);
    setTForm(emptyTimbradoForm);
    setTError(null);
    setTOpen(true);
  }
  function abrirEdicionTimbrado(t: Timbrado) {
    setTEditandoId(t.id);
    setTForm({
      numeroTimbrado: t.numeroTimbrado,
      tipoDocumento: t.tipoDocumento,
      esElectronico: t.esElectronico,
      numeroDesde: String(t.numeroDesde),
      numeroHasta: String(t.numeroHasta),
      fechaInicioVigencia: t.fechaInicioVigencia.slice(0, 10),
      fechaFinVigencia: t.fechaFinVigencia ? t.fechaFinVigencia.slice(0, 10) : '',
    });
    setTError(null);
    setTOpen(true);
  }

  if (!esAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-500">Esta sección es solo para administradores.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Establecimientos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Sucursales, puntos de expedición y timbrados. Elegí un establecimiento y luego un punto de expedición para
          ver sus timbrados.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Establecimientos"
          actions={<Button onClick={abrirNuevoEstablecimiento}>Nuevo establecimiento</Button>}
        />
        {cargandoEstablecimientos ? null : !establecimientos || establecimientos.length === 0 ? (
          <EmptyState message="Todavía no cargaste ningún establecimiento." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Ciudad</Th>
                <Th>Estado</Th>
                <Th>{''}</Th>
              </tr>
            </Thead>
            <tbody>
              {establecimientos.map((e) => (
                <Tr key={e.id} onClick={() => { setEstablecimientoId(e.id); setPuntoExpedicionId(null); }}>
                  <Td className="font-mono text-ink-900">{e.codigo}</Td>
                  <Td className={e.id === establecimientoId ? 'font-semibold text-brand-700' : 'font-medium text-ink-900'}>
                    {e.nombre} {e.esCasaMatriz && <span className="ml-1 text-xs font-normal text-ink-400">(casa matriz)</span>}
                  </Td>
                  <Td className="text-ink-500">{e.ciudad}</Td>
                  <Td>
                    <Badge tone={e.activo ? 'success' : 'neutral'}>{e.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); abrirEdicionEstablecimiento(e); }}
                        className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); estToggleActivoMutation.mutate({ id: e.id, activo: e.activo }); }}
                        className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                      >
                        {e.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {establecimientoId && (
        <Card>
          <CardHeader
            title={`Puntos de expedición — ${establecimientoSeleccionado?.nombre ?? ''}`}
            actions={<Button onClick={abrirNuevoPuntoExpedicion}>Nuevo punto de expedición</Button>}
          />
          {cargandoPuntosExpedicion ? null : !puntosExpedicion || puntosExpedicion.length === 0 ? (
            <EmptyState message="Este establecimiento todavía no tiene puntos de expedición." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Descripción</Th>
                  <Th>Estado</Th>
                  <Th>{''}</Th>
                </tr>
              </Thead>
              <tbody>
                {puntosExpedicion.map((p) => (
                  <Tr key={p.id} onClick={() => setPuntoExpedicionId(p.id)}>
                    <Td className="font-mono text-ink-900">{p.codigo}</Td>
                    <Td className={p.id === puntoExpedicionId ? 'font-semibold text-brand-700' : 'font-medium text-ink-900'}>
                      {p.descripcion}
                    </Td>
                    <Td>
                      <Badge tone={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-3">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); abrirEdicionPuntoExpedicion(p); }}
                          className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); peToggleActivoMutation.mutate({ id: p.id, activo: p.activo }); }}
                          className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                        >
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {puntoExpedicionId && (
        <Card>
          <CardHeader
            title={`Timbrados — PE ${puntoExpedicionSeleccionado?.codigo ?? ''}`}
            actions={<Button onClick={abrirNuevoTimbrado}>Nuevo timbrado</Button>}
          />
          {cargandoTimbrados ? null : !timbrados || timbrados.length === 0 ? (
            <EmptyState message="Este punto de expedición todavía no tiene timbrados." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Número</Th>
                  <Th>Tipo de documento</Th>
                  <Th>Régimen</Th>
                  <Th>Numeración</Th>
                  <Th>Vigencia</Th>
                  <Th>Estado</Th>
                  <Th>{''}</Th>
                </tr>
              </Thead>
              <tbody>
                {timbrados.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-mono text-ink-900">{t.numeroTimbrado}</Td>
                    <Td className="text-ink-700">{TIPO_DOCUMENTO_LABEL[t.tipoDocumento]}</Td>
                    <Td>
                      <Badge tone={t.esElectronico ? 'brand' : 'neutral'}>
                        {t.esElectronico ? 'Electrónico' : 'Tradicional'}
                      </Badge>
                    </Td>
                    <Td className="text-ink-500 tabular-nums">
                      {t.proximoNumero} / {t.numeroDesde}–{t.numeroHasta}
                    </Td>
                    <Td className="text-ink-500">
                      {formatDate(t.fechaInicioVigencia)}
                      {t.fechaFinVigencia ? ` – ${formatDate(t.fechaFinVigencia)}` : ''}
                    </Td>
                    <Td>
                      <Badge tone={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-3">
                        <button
                          onClick={() => abrirEdicionTimbrado(t)}
                          className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => tToggleActivoMutation.mutate({ id: t.id, activo: t.activo })}
                          className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                        >
                          {t.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Establecimiento: alta/edición */}
      <Dialog
        open={estOpen}
        onClose={() => setEstOpen(false)}
        title={estEditandoId ? 'Editar establecimiento' : 'Nuevo establecimiento'}
        width="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            estMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {estError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{estError}</div>}

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Código (3 dígitos)" required>
              <Input
                value={estForm.codigo}
                onChange={(e) => setEstForm({ ...estForm, codigo: e.target.value })}
                maxLength={3}
                placeholder="001"
                required
                autoFocus
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Nombre" required>
                <Input value={estForm.nombre} onChange={(e) => setEstForm({ ...estForm, nombre: e.target.value })} required />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Dirección" required>
              <Input value={estForm.direccion} onChange={(e) => setEstForm({ ...estForm, direccion: e.target.value })} required />
            </FormField>
            <FormField label="Ciudad" required>
              <Input value={estForm.ciudad} onChange={(e) => setEstForm({ ...estForm, ciudad: e.target.value })} required />
            </FormField>
          </div>
          <FormField label="Departamento" required>
            <Input value={estForm.departamento} onChange={(e) => setEstForm({ ...estForm, departamento: e.target.value })} required />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Teléfono (opcional)">
              <Input value={estForm.telefono} onChange={(e) => setEstForm({ ...estForm, telefono: e.target.value })} />
            </FormField>
            <FormField label="Email (opcional)">
              <Input type="email" value={estForm.email} onChange={(e) => setEstForm({ ...estForm, email: e.target.value })} />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={estForm.esCasaMatriz}
              onChange={(e) => setEstForm({ ...estForm, esCasaMatriz: e.target.checked })}
            />
            Es la casa matriz
          </label>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setEstOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={estMutation.isPending}>
              {estMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Punto de expedición: alta/edición */}
      <Dialog
        open={peOpen}
        onClose={() => setPeOpen(false)}
        title={peEditandoId ? 'Editar punto de expedición' : 'Nuevo punto de expedición'}
        width="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            peMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {peError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{peError}</div>}

          <FormField label="Código (3 dígitos)" required>
            <Input value={peForm.codigo} onChange={(e) => setPeForm({ ...peForm, codigo: e.target.value })} maxLength={3} placeholder="001" required autoFocus />
          </FormField>
          <FormField label="Descripción" required>
            <Input value={peForm.descripcion} onChange={(e) => setPeForm({ ...peForm, descripcion: e.target.value })} required />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setPeOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={peMutation.isPending}>
              {peMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Timbrado: alta/edición */}
      <Dialog open={tOpen} onClose={() => setTOpen(false)} title={tEditandoId ? 'Editar timbrado' : 'Nuevo timbrado'} width="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            tMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {tError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{tError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Número de timbrado (8 dígitos)" required>
              <Input
                value={tForm.numeroTimbrado}
                onChange={(e) => setTForm({ ...tForm, numeroTimbrado: e.target.value })}
                maxLength={8}
                required
                autoFocus
              />
            </FormField>
            <FormField label="Tipo de documento" required>
              <Select value={tForm.tipoDocumento} onChange={(e) => setTForm({ ...tForm, tipoDocumento: e.target.value as TipoDocumentoElectronico })}>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Régimen">
            <Select value={tForm.esElectronico ? '1' : '0'} onChange={(e) => setTForm({ ...tForm, esElectronico: e.target.value === '1' })}>
              <option value="1">Electrónico (SIFEN)</option>
              <option value="0">Tradicional (preimpreso/virtual, sin exigencias SIFEN)</option>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Numeración desde" required>
              <Input type="number" min="1" value={tForm.numeroDesde} onChange={(e) => setTForm({ ...tForm, numeroDesde: e.target.value })} required />
            </FormField>
            <FormField label="Numeración hasta" required>
              <Input type="number" min="1" value={tForm.numeroHasta} onChange={(e) => setTForm({ ...tForm, numeroHasta: e.target.value })} required />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vigente desde" required>
              <Input type="date" value={tForm.fechaInicioVigencia} onChange={(e) => setTForm({ ...tForm, fechaInicioVigencia: e.target.value })} required />
            </FormField>
            <FormField label="Vigente hasta (opcional)">
              <Input type="date" value={tForm.fechaFinVigencia} onChange={(e) => setTForm({ ...tForm, fechaFinVigencia: e.target.value })} />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setTOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={tMutation.isPending}>
              {tMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
