import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaActiva } from '../lib/empresa-activa-context';
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
  logoUrl: '' as string,
};

// Limite generoso para un logo (se guarda como data URI en la misma fila de
// la empresa, no en un storage aparte) -- alcanza de sobra para un isotipo
// chico y evita filas gigantes en la base.
const LOGO_MAX_BYTES = 300 * 1024;

function leerImagenComoDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const emptyOperadorForm = {
  nombre: '',
  email: '',
  password: '',
};

// Alta de un tenant nuevo y completamente separado -- para ofrecer el
// sistema a un cliente. Crea la Empresa, sus dos roles fijos (Administrador
// y Operador) y el primer usuario del cliente, con rol Operador -- el
// cliente nunca recibe un login Admin. La configuracion de establecimiento,
// punto de expedicion y timbrado la hace el superadmin eligiendo esta
// empresa en el selector "Empresa activa" del menu.
export default function NuevaEmpresaPage() {
  const { esAdmin } = useAuth();
  const { setEmpresaActivaId } = useEmpresaActiva();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresaForm);
  const [operadorForm, setOperadorForm] = useState(emptyOperadorForm);
  const [empresaCreada, setEmpresaCreada] = useState<Empresa | null>(null);
  const [rolOperadorId, setRolOperadorId] = useState('');
  const [rucDialogOpen, setRucDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('El logo no puede pesar más de 300 KB. Probá con una imagen más chica o comprimida.');
      return;
    }
    setLogoError(null);
    const dataUri = await leerImagenComoDataUri(file);
    setEmpresaForm((f) => ({ ...f, logoUrl: dataUri }));
  };

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
          logoUrl: empresaForm.logoUrl || undefined,
        })
      ).data;

      const [, rolOperador] = await Promise.all([
        api.post('/roles', { empresaId: empresa.id, nombre: 'Administrador', tipo: 'ADMIN' }),
        api.post<{ id: string }>('/roles', { empresaId: empresa.id, nombre: 'Operador', tipo: 'OPERADOR' }),
      ]);

      return { empresa, rolOperadorId: rolOperador.data.id };
    },
    onSuccess: ({ empresa, rolOperadorId }) => {
      setEmpresaCreada(empresa);
      setRolOperadorId(rolOperadorId);
      setEmpresaActivaId(empresa.id);
      queryClient.invalidateQueries({ queryKey: ['empresas-todas'] });
      setError(null);
      setPaso(2);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const crearOperadorMutation = useMutation({
    mutationFn: () =>
      api.post('/usuarios', {
        empresaId: empresaCreada!.id,
        rolId: rolOperadorId,
        nombre: operadorForm.nombre,
        email: operadorForm.email,
        password: operadorForm.password,
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
  const puedeCrearOperador = operadorForm.nombre && operadorForm.email && operadorForm.password.length >= 8;

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
            <p className="mt-1 text-sm text-ink-500">Pasale estas credenciales al cliente:</p>
          </div>
          <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3 text-sm">
            <p>
              <span className="text-ink-500">Email:</span> <span className="font-mono">{operadorForm.email}</span>
            </p>
            <p>
              <span className="text-ink-500">Contraseña:</span> <span className="font-mono">{operadorForm.password}</span>
            </p>
          </div>
          <p className="text-xs text-ink-400">
            Ese login entra como Operador de {empresaCreada?.razonSocial} -- solo a las pantallas del día a día, sin
            acceso a configuración. "{empresaCreada?.razonSocial}" ya quedó como tu empresa activa (arriba en el menú):
            desde ahí podés cargar su establecimiento, punto de expedición y timbrado en Facturación, o crearle más
            usuarios Operador desde Usuarios.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPaso(1);
                setEmpresaForm(emptyEmpresaForm);
                setOperadorForm(emptyOperadorForm);
                setEmpresaCreada(null);
                setLogoError(null);
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
        <CardHeader title={paso === 1 ? '1. Datos de la empresa' : '2. Primer usuario (Operador)'} />
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

              <FormField label="Logo (opcional)">
                <div className="flex items-center gap-3">
                  {empresaForm.logoUrl ? (
                    <img
                      src={empresaForm.logoUrl}
                      alt="Logo de la empresa"
                      className="h-12 w-12 rounded border border-ink-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-ink-300 text-[9px] text-ink-400">
                      Sin logo
                    </div>
                  )}
                  <label className="cursor-pointer rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
                    {empresaForm.logoUrl ? 'Cambiar' : 'Subir imagen'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {empresaForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setEmpresaForm((f) => ({ ...f, logoUrl: '' }))}
                      className="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
                <p className="mt-1 text-xs text-ink-400">
                  Se muestra en el encabezado de los comprobantes y recibos impresos de esta empresa.
                </p>
              </FormField>

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
                crearOperadorMutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-ink-500">
                Empresa <span className="font-medium text-ink-900">{empresaCreada?.razonSocial}</span> creada. Ahora cargá
                el primer usuario para el cliente, que va a tener el rol Operador dentro de esa empresa (sin acceso a
                configuración).
              </p>

              <FormField label="Nombre" required>
                <Input
                  value={operadorForm.nombre}
                  onChange={(e) => setOperadorForm({ ...operadorForm, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </FormField>
              <FormField label="Email" required>
                <Input
                  type="email"
                  value={operadorForm.email}
                  onChange={(e) => setOperadorForm({ ...operadorForm, email: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Contraseña (mínimo 8 caracteres)" required>
                <Input
                  type="password"
                  value={operadorForm.password}
                  onChange={(e) => setOperadorForm({ ...operadorForm, password: e.target.value })}
                  minLength={8}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2 border-t border-ink-100 pt-3">
                <Button type="submit" disabled={!puedeCrearOperador || crearOperadorMutation.isPending}>
                  {crearOperadorMutation.isPending ? 'Creando…' : 'Crear usuario Operador'}
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
