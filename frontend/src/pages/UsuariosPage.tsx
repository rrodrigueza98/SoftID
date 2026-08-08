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
import type { Modulo, Rol, Usuario } from '../lib/types';

const MODULOS: { value: Modulo; label: string }[] = [
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'INVENTARIO', label: 'Inventario' },
  { value: 'CONTABILIDAD', label: 'Contabilidad' },
];

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rolId: '',
  modulosPermitidos: [] as Modulo[],
};

const emptyEditForm = {
  nombre: '',
  email: '',
  rolId: '',
  modulosPermitidos: [] as Modulo[],
};

function toggleModulo(lista: Modulo[], m: Modulo): Modulo[] {
  return lista.includes(m) ? lista.filter((x) => x !== m) : [...lista, m];
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios', empresaId] });
      setEditandoId(null);
      setEditError(null);
    },
    onError: (err) => setEditError(apiErrorMessage(err)),
  });

  function abrirEdicion(u: Usuario) {
    setEditandoId(u.id);
    setEditForm({ nombre: u.nombre, email: u.email, rolId: u.rolId, modulosPermitidos: u.modulosPermitidos });
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
            <FormField label="Módulos permitidos">
              <div className="flex flex-col gap-1.5">
                {MODULOS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={form.modulosPermitidos.includes(m.value)}
                      onChange={() => setForm({ ...form, modulosPermitidos: toggleModulo(form.modulosPermitidos, m.value) })}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ninguno, el usuario accede a todos los módulos operativos.
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
            <FormField label="Módulos permitidos">
              <div className="flex flex-col gap-1.5">
                {MODULOS.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={editForm.modulosPermitidos.includes(m.value)}
                      onChange={() =>
                        setEditForm({ ...editForm, modulosPermitidos: toggleModulo(editForm.modulosPermitidos, m.value) })
                      }
                    />
                    {m.label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                Si no marcás ninguno, el usuario accede a todos los módulos operativos.
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
    </div>
  );
}
