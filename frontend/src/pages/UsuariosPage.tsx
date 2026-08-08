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
import type { Rol, Usuario } from '../lib/types';

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rolId: '',
};

export default function UsuariosPage() {
  const { usuario: yo, esAdmin } = useAuth();
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', empresaId],
    queryFn: async () => (await api.get<Usuario[]>('/usuarios', { params: { empresaId } })).data,
    enabled: esAdmin,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', empresaId],
    queryFn: async () => (await api.get<Rol[]>('/roles', { params: { empresaId } })).data,
    enabled: esAdmin && open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/usuarios', {
        empresaId,
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rolId: form.rolId,
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

  const puedeCrear = form.nombre && form.email && form.password.length >= 8 && form.rolId;

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
                    {u.id !== yo?.id && (
                      <button
                        onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: u.activo })}
                        className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
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
    </div>
  );
}
