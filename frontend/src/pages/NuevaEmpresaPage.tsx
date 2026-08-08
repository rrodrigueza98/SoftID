import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { RucSearchBox, type ResultadoBusquedaRuc } from '../components/RucSearch';
import type { Empresa, RegimenTributario, TipoContribuyente } from '../lib/types';

const emptyEmpresaForm = {
  ruc: '',
  dvRuc: '',
  razonSocial: '',
  nombreFantasia: '',
  tipoContribuyente: 'JURIDICA' as TipoContribuyente,
  regimenTributario: 'IRE_GENERAL' as RegimenTributario,
  direccion: '',
  ciudad: '',
  departamento: '',
  telefono: '',
  email: '',
};

const emptyAdminForm = {
  nombre: '',
  email: '',
  password: '',
};

// Alta de un tenant nuevo y completamente separado -- para ofrecer el
// sistema a un cliente. Crea la Empresa, sus dos roles fijos (Administrador
// y Operador) y el primer usuario Administrador del cliente. El timbrado se
// carga despues, ya logueado como ese usuario (mismo flujo guiado que usa
// cualquier empresa nueva en Facturacion).
export default function NuevaEmpresaPage() {
  const { esAdmin } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresaForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [empresaCreada, setEmpresaCreada] = useState<Empresa | null>(null);
  const [rolAdminId, setRolAdminId] = useState('');
  const [rucDialogOpen, setRucDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const crearEmpresaMutation = useMutation({
    mutationFn: async () => {
      const empresa = (
        await api.post<Empresa>('/empresas', {
          ruc: empresaForm.ruc,
          dvRuc: empresaForm.dvRuc,
          razonSocial: empresaForm.razonSocial,
          nombreFantasia: empresaForm.nombreFantasia || undefined,
          tipoContribuyente: empresaForm.tipoContribuyente,
          regimenTributario: empresaForm.regimenTributario,
          direccion: empresaForm.direccion,
          ciudad: empresaForm.ciudad,
          departamento: empresaForm.departamento,
          telefono: empresaForm.telefono || undefined,
          email: empresaForm.email || undefined,
        })
      ).data;

      const [rolAdmin] = await Promise.all([
        api.post<{ id: string }>('/roles', { empresaId: empresa.id, nombre: 'Administrador', tipo: 'ADMIN' }),
        api.post('/roles', { empresaId: empresa.id, nombre: 'Operador', tipo: 'OPERADOR' }),
      ]);

      return { empresa, rolAdminId: rolAdmin.data.id };
    },
    onSuccess: ({ empresa, rolAdminId }) => {
      setEmpresaCreada(empresa);
      setRolAdminId(rolAdminId);
      setError(null);
      setPaso(2);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const crearAdminMutation = useMutation({
    mutationFn: () =>
      api.post('/usuarios', {
        empresaId: empresaCreada!.id,
        rolId: rolAdminId,
        nombre: adminForm.nombre,
        email: adminForm.email,
        password: adminForm.password,
      }),
    onSuccess: () => {
      setError(null);
      setListo(true);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!esAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-500">Esta sección es solo para administradores.</p>
      </Card>
    );
  }

  const puedeCrearEmpresa =
    empresaForm.ruc && empresaForm.dvRuc && empresaForm.razonSocial && empresaForm.direccion && empresaForm.ciudad && empresaForm.departamento;
  const puedeCrearAdmin = adminForm.nombre && adminForm.email && adminForm.password.length >= 8;

  if (listo) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-ink-900">Nueva empresa</h1>
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            ✓
          </div>
          <div>
            <p className="font-medium text-ink-900">{empresaCreada?.razonSocial} está lista</p>
            <p className="mt-1 text-sm text-ink-500">
              Pasale estas credenciales al cliente, o entrá vos mismo para cargar el timbrado antes de dárselas:
            </p>
          </div>
          <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm">
            <p>
              <span className="text-ink-500">Email:</span> <span className="font-mono">{adminForm.email}</span>
            </p>
            <p>
              <span className="text-ink-500">Contraseña:</span> <span className="font-mono">{adminForm.password}</span>
            </p>
          </div>
          <p className="text-xs text-ink-400">
            Con ese login entra como Administrador de {empresaCreada?.razonSocial} y puede configurar establecimiento,
            punto de expedición y timbrado desde Facturación, igual que se hizo para RJRA.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPaso(1);
                setEmpresaForm(emptyEmpresaForm);
                setAdminForm(emptyAdminForm);
                setEmpresaCreada(null);
                setListo(false);
              }}
            >
              Crear otra empresa
            </Button>
            <Button onClick={() => navigate('/')}>Volver al inicio</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Nueva empresa</h1>
        <p className="mt-1 text-sm text-ink-500">
          Crea un tenant nuevo y completamente separado del tuyo — usalo para dar de alta un cliente.
        </p>
      </div>

      <Card>
        <CardHeader title={paso === 1 ? '1. Datos de la empresa' : '2. Primer usuario (Administrador)'} />
        <div className="p-5">
          {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {paso === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                crearEmpresaMutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField label="RUC" required>
                    <div className="flex gap-2">
                      <Input value={empresaForm.ruc} onChange={(e) => setEmpresaForm({ ...empresaForm, ruc: e.target.value })} required />
                      <Button type="button" variant="secondary" onClick={() => setRucDialogOpen(true)}>
                        Buscar en DNIT
                      </Button>
                    </div>
                  </FormField>
                </div>
                <FormField label="DV" required>
                  <Input
                    value={empresaForm.dvRuc}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, dvRuc: e.target.value })}
                    maxLength={1}
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Razón social" required>
                  <Input
                    value={empresaForm.razonSocial}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, razonSocial: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Nombre de fantasía (opcional)">
                  <Input
                    value={empresaForm.nombreFantasia}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nombreFantasia: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tipo de contribuyente" required>
                  <Select
                    value={empresaForm.tipoContribuyente}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, tipoContribuyente: e.target.value as TipoContribuyente })}
                  >
                    <option value="FISICA">Persona física</option>
                    <option value="JURIDICA">Persona jurídica</option>
                  </Select>
                </FormField>
                <FormField label="Régimen tributario">
                  <Select
                    value={empresaForm.regimenTributario}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, regimenTributario: e.target.value as RegimenTributario })}
                  >
                    <option value="IRE_GENERAL">IRE General</option>
                    <option value="IRE_SIMPLE">IRE Simple</option>
                    <option value="IRE_RESIT">IRE RESIT</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <FormField label="Dirección" required>
                    <Input
                      value={empresaForm.direccion}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, direccion: e.target.value })}
                      required
                    />
                  </FormField>
                </div>
                <FormField label="Ciudad" required>
                  <Input value={empresaForm.ciudad} onChange={(e) => setEmpresaForm({ ...empresaForm, ciudad: e.target.value })} required />
                </FormField>
                <FormField label="Departamento" required>
                  <Input
                    value={empresaForm.departamento}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, departamento: e.target.value })}
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Teléfono (opcional)">
                  <Input value={empresaForm.telefono} onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })} />
                </FormField>
                <FormField label="Email (opcional)">
                  <Input
                    type="email"
                    value={empresaForm.email}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                  />
                </FormField>
              </div>

              <div className="flex justify-end border-t border-ink-100 pt-3">
                <Button type="submit" disabled={!puedeCrearEmpresa || crearEmpresaMutation.isPending}>
                  {crearEmpresaMutation.isPending ? 'Creando…' : 'Siguiente'}
                </Button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                crearAdminMutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-ink-500">
                Empresa <span className="font-medium text-ink-900">{empresaCreada?.razonSocial}</span> creada. Ahora cargá
                el primer usuario, que va a tener el rol Administrador dentro de esa empresa.
              </p>

              <FormField label="Nombre" required>
                <Input value={adminForm.nombre} onChange={(e) => setAdminForm({ ...adminForm, nombre: e.target.value })} required autoFocus />
              </FormField>
              <FormField label="Email" required>
                <Input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Contraseña (mínimo 8 caracteres)" required>
                <Input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  minLength={8}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
                <Button type="submit" disabled={!puedeCrearAdmin || crearAdminMutation.isPending}>
                  {crearAdminMutation.isPending ? 'Creando…' : 'Crear usuario Administrador'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Dialog open={rucDialogOpen} onClose={() => setRucDialogOpen(false)} title="Buscar en DNIT">
        <RucSearchBox
          onSelect={(r: ResultadoBusquedaRuc) => {
            setEmpresaForm((f) => ({
              ...f,
              ruc: r.ruc,
              dvRuc: r.dv,
              razonSocial: f.razonSocial || r.razonSocial,
            }));
            setRucDialogOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}
