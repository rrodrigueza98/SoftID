import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaId } from '../lib/hooks';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import type { Establecimiento, Modulo, Pantalla, Rol, Usuario } from '../lib/types';

const MODULOS: { value: Modulo; label: string }[] = [
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'INVENTARIO', label: 'Inventario' },
  { value: 'CONTABILIDAD', label: 'Contabilidad' },
];

// Pantallas de cada modulo -- se muestran anidadas debajo del modulo cuando
// este esta tildado, para acotar aun mas al operador dentro de el.
const PANTALLAS_POR_MODULO: Record<Modulo, { value: Pantalla; label: string }[]> = {
  VENTAS: [
    { value: 'PUNTO_DE_VENTA', label: 'Punto de venta' },
    { value: 'FACTURACION', label: 'Facturación' },
    { value: 'COMPROBANTES_EMITIDOS', label: 'Comprobantes emitidos' },
    { value: 'CLIENTES', label: 'Clientes' },
    { value: 'CUENTAS_CORRIENTES', label: 'Cuentas corrientes' },
  ],
  COMPRAS: [
    { value: 'PROVEEDORES', label: 'Proveedores' },
    { value: 'COMPROBANTES_COMPRA', label: 'Comprobantes de compra' },
  ],
  INVENTARIO: [
    { value: 'PRODUCTOS', label: 'Productos' },
    { value: 'STOCK', label: 'Stock' },
  ],
  CONTABILIDAD: [{ value: 'CONTABILIDAD', label: 'Contabilidad' }],
};

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rolId: '',
  modulosPermitidos: [] as Modulo[],
  puntosExpedicionPermitidos: [] as string[],
  pantallasPermitidas: [] as Pantalla[],
};

const emptyEditForm = {
  nombre: '',
  email: '',
  rolId: '',
  modulosPermitidos: [] as Modulo[],
  puntosExpedicionPermitidos: [] as string[],
  pantallasPermitidas: [] as Pantalla[],
};

function toggleModulo(lista: Modulo[], m: Modulo): Modulo[] {
  return lista.includes(m) ? lista.filter((x) => x !== m) : [...lista, m];
}

function togglePunto(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

function togglePantalla(lista: Pantalla[], p: Pantalla): Pantalla[] {
  return lista.includes(p) ? lista.filter((x) => x !== p) : [...lista, p];
}

// Checklist de modulos con las pantallas de cada uno anidadas debajo,
// visibles solo si ese modulo esta tildado -- se reutiliza en alta y edicion.
function ChecklistModulosYPantallas({
  modulosSeleccionados,
  onToggleModulo,
  pantallasSeleccionadas,
  onTogglePantalla,
}: {
  modulosSeleccionados: Modulo[];
  onToggleModulo: (m: Modulo) => void;
  pantallasSeleccionadas: Pantalla[];
  onTogglePantalla: (p: Pantalla) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {MODULOS.map((m) => {
        const activo = modulosSeleccionados.includes(m.value);
        return (
          <div key={m.value}>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={activo} onChange={() => onToggleModulo(m.value)} />
              {m.label}
            </label>
            {activo && (
              <div className="mt-1 flex flex-col gap-1 border-l border-ink-100 pl-4">
                {PANTALLAS_POR_MODULO[m.value].map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-xs text-ink-600">
                    <input
                      type="checkbox"
                      checked={pantallasSeleccionadas.includes(p.value)}
                      onChange={() => onTogglePantalla(p.value)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Checklist de puntos de expedicion, agrupados por establecimiento -- se
// reutiliza igual en el dialog de alta y el de edicion.
function ChecklistPuntosExpedicion({
  establecimientos,
  seleccionados,
  onToggle,
}: {
  establecimientos?: Establecimiento[];
  seleccionados: string[];
  onToggle: (id: string) => void;
}) {
  if (!establecimientos || establecimientos.length === 0) {
    return <p className="text-xs text-ink-400">Todavía no hay puntos de expedición cargados.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {establecimientos.map((est) => (
        <div key={est.id}>
          <p className="mb-1 text-xs font-semibold text-ink-600">
            {est.codigo} — {est.nombre}
          </p>
          {!est.puntosExpedicion || est.puntosExpedicion.length === 0 ? (
            <p className="text-xs text-ink-400">Sin puntos de expedición.</p>
          ) : (
            <div className="flex flex-col gap-1.5 pl-2">
              {est.puntosExpedicion.map((pe) => (
                <label key={pe.id} className="flex items-center gap-2 text-sm text-ink-700">
                  <input type="checkbox" checked={seleccionados.includes(pe.id)} onChange={() => onToggle(pe.id)} />
                  {pe.codigo} — {pe.descripcion}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UsuariosPage() {
  const { usuario: yo, esAdmin } = useAuth();
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState<string | null>(null);

  const [reseteandoId, setReseteandoId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', empresaId],
    queryFn: async () => (await api.get<Usuario[]>('/usuarios', { params: { empresaId } })).data,
    enabled: esAdmin,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', empresaId],
    queryFn: async () => (await api.get<Rol[]>('/roles', { params: { empresaId } })).data,
    enabled: esAdmin && (open || Boolean(editandoId)),
  });

  const { data: establecimientos } = useQuery({
    queryKey: ['establecimientos', empresaId],
    queryFn: async () => (await api.get<Establecimiento[]>('/establecimientos', { params: { empresaId } })).data,
    enabled: esAdmin && (open || Boolean(editandoId)),
  });

  const rolSeleccionado = roles?.find((r) => r.id === form.rolId);
  const rolSeleccionadoEdicion = roles?.find((r) => r.id === editForm.rolId);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/usuarios', {
        empresaId,
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rolId: form.rolId,
        modulosPermitidos: form.modulosPermitidos,
        puntosExpedicionPermitidos: form.puntosExpedicionPermitidos,
        pantallasPermitidas: form.pantallasPermitidas,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      setOpen(false);
      setForm(emptyForm);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.patch(`/usuarios/${id}/${activo ? 'desactivar' : 'activar'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] }),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      api.patch(`/usuarios/${editandoId}`, {
        nombre: editForm.nombre,
        email: editForm.email,
        rolId: editForm.rolId,
        modulosPermitidos: editForm.modulosPermitidos,
        puntosExpedicionPermitidos: editForm.puntosExpedicionPermitidos,
        pantallasPermitidas: editForm.pantallasPermitidas,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      setEditandoId(null);
      setEditError(null);
    },
    onError: (err) => setEditError(apiErrorMessage(err)),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.patch(`/usuarios/${reseteandoId}/resetear-password`, { passwordNueva: resetPasswordValue }),
    onSuccess: () => {
      setReseteandoId(null);
      setResetPasswordValue('');
      setResetError(null);
    },
    onError: (err) => setResetError(apiErrorMessage(err)),
  });

  function abrirEdicion(u: Usuario) {
    setEditandoId(u.id);
    setEditForm({
      nombre: u.nombre,
      email: u.email,
      rolId: u.rolId,
      modulosPermitidos: u.modulosPermitidos,
      puntosExpedicionPermitidos: u.puntosExpedicionPermitidos,
      pantallasPermitidas: u.pantallasPermitidas,
    });
    setEditError(null);
  }

  const puedeCrear = form.nombre && form.email && form.password.length >= 8 && form.rolId;
  const puedeGuardarEdicion = editForm.nombre && editForm.email && editForm.rolId;

  if (!esAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-500">Esta sección es solo para administradores.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Usuarios</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setError(null);
            setOpen(true);
          }}
        >
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardHeader title="Usuarios con acceso al sistema" />
        {isLoading ? (
          <PageSpinner />
        ) : !usuarios || usuarios.length === 0 ? (
          <EmptyState message="Todavía no hay usuarios cargados." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Email</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>{''}</Th>
              </tr>
            </Thead>
            <tbody>
              {usuarios.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium text-ink-900">{u.nombre}</Td>
                  <Td className="text-ink-500">{u.email}</Td>
                  <Td className="text-ink-700">{u.rol.nombre}</Td>
                  <Td>
                    <Badge tone={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <button
                        onClick={() => abrirEdicion(u)}
                        className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setReseteandoId(u.id);
                          setResetPasswordValue('');
                          setResetError(null);
                        }}
                        className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                      >
                        Restablecer contraseña
                      </button>
                      {u.id !== yo?.id && (
                        <button
                          onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: u.activo })}
                          className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo usuario" width="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <FormField label="Nombre" required>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required autoFocus />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Contraseña (mínimo 8 caracteres)" required>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </FormField>

          <FormField label="Rol" required>
            <Select value={form.rolId} onChange={(e) => setForm({ ...form, rolId: e.target.value })} required>
              <option value="">Elegir…</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          {rolSeleccionado?.tipo === 'OPERADOR' && (
            <FormField label="Módulos y pantallas permitidas">
              <ChecklistModulosYPantallas
                modulosSeleccionados={form.modulosPermitidos}
                onToggleModulo={(m) => setForm({ ...form, modulosPermitidos: toggleModulo(form.modulosPermitidos, m) })}
                pantallasSeleccionadas={form.pantallasPermitidas}
                onTogglePantalla={(p) => setForm({ ...form, pantallasPermitidas: togglePantalla(form.pantallasPermitidas, p) })}
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ningún módulo, el usuario accede a todos. Tildando pantallas dentro de un módulo lo acotás
                todavía más (ej. Ventas, pero solo Punto de venta).
              </p>
            </FormField>
          )}

          {rolSeleccionado?.tipo === 'OPERADOR' && (
            <FormField label="Puntos de expedición permitidos">
              <ChecklistPuntosExpedicion
                establecimientos={establecimientos}
                seleccionados={form.puntosExpedicionPermitidos}
                onToggle={(id) => setForm({ ...form, puntosExpedicionPermitidos: togglePunto(form.puntosExpedicionPermitidos, id) })}
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ninguno, el usuario emite y ve comprobantes de cualquier punto de expedición.
              </p>
            </FormField>
          )}

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!puedeCrear || mutation.isPending}>
              {mutation.isPending ? 'Creando…' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(editandoId)} onClose={() => setEditandoId(null)} title="Editar usuario" width="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {editError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>}

          <FormField label="Nombre" required>
            <Input
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              required
              autoFocus
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Rol" required>
            <Select value={editForm.rolId} onChange={(e) => setEditForm({ ...editForm, rolId: e.target.value })} required>
              <option value="">Elegir…</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          {rolSeleccionadoEdicion?.tipo === 'OPERADOR' && (
            <FormField label="Módulos y pantallas permitidas">
              <ChecklistModulosYPantallas
                modulosSeleccionados={editForm.modulosPermitidos}
                onToggleModulo={(m) =>
                  setEditForm({ ...editForm, modulosPermitidos: toggleModulo(editForm.modulosPermitidos, m) })
                }
                pantallasSeleccionadas={editForm.pantallasPermitidas}
                onTogglePantalla={(p) =>
                  setEditForm({ ...editForm, pantallasPermitidas: togglePantalla(editForm.pantallasPermitidas, p) })
                }
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ningún módulo, el usuario accede a todos. Tildando pantallas dentro de un módulo lo acotás
                todavía más (ej. Ventas, pero solo Punto de venta).
              </p>
            </FormField>
          )}

          {rolSeleccionadoEdicion?.tipo === 'OPERADOR' && (
            <FormField label="Puntos de expedición permitidos">
              <ChecklistPuntosExpedicion
                establecimientos={establecimientos}
                seleccionados={editForm.puntosExpedicionPermitidos}
                onToggle={(id) =>
                  setEditForm({ ...editForm, puntosExpedicionPermitidos: togglePunto(editForm.puntosExpedicionPermitidos, id) })
                }
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ninguno, el usuario emite y ve comprobantes de cualquier punto de expedición.
              </p>
            </FormField>
          )}

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setEditandoId(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!puedeGuardarEdicion || editMutation.isPending}>
              {editMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(reseteandoId)}
        onClose={() => setReseteandoId(null)}
        title="Restablecer contraseña"
        width="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {resetError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</div>}

          <p className="text-sm text-ink-500">
            Elegí una contraseña temporal y comunicásela al usuario por el medio que prefieras.
          </p>

          <FormField label="Nueva contraseña (mínimo 8 caracteres)" required>
            <Input
              type="password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              minLength={8}
              required
              autoFocus
            />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setReseteandoId(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={resetPasswordValue.length < 8 || resetMutation.isPending}>
              {resetMutation.isPending ? 'Restableciendo…' : 'Restablecer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
