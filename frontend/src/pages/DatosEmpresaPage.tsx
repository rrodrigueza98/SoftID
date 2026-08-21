import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaId } from '../lib/hooks';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { Empresa, RegimenTributario, TipoContribuyente } from '../lib/types';

const emptyForm = {
  razonSocial: '',
  nombreFantasia: '',
  tipoContribuyente: 'JURIDICA' as TipoContribuyente,
  regimenTributario: 'IRE_GENERAL' as RegimenTributario,
  direccion: '',
  ciudad: '',
  departamento: '',
  telefono: '',
  email: '',
  actividadEconomicaCodigo: '',
  actividadEconomicaDescripcion: '',
};

// Edicion de los datos de la empresa activa -- a diferencia de
// Establecimientos (una lista), esto es un formulario unico porque cada
// empresa solo tiene una fila propia para editar. Cubre en particular los
// campos que SIFEN exige en la practica para poder emitir Documentos
// Electronicos (telefono, email, actividad economica) pero que hasta ahora
// solo se podian cargar al crear la empresa (Nueva empresa), sin forma de
// corregirlos despues.
export default function DatosEmpresaPage() {
  const { esAdmin } = useAuth();
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const { data: empresa, isLoading } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => (await api.get<Empresa>(`/empresas/${empresaId}`)).data,
  });

  useEffect(() => {
    if (!empresa) return;
    setForm({
      razonSocial: empresa.razonSocial,
      nombreFantasia: empresa.nombreFantasia ?? '',
      tipoContribuyente: empresa.tipoContribuyente,
      regimenTributario: empresa.regimenTributario ?? 'IRE_GENERAL',
      direccion: empresa.direccion,
      ciudad: empresa.ciudad,
      departamento: empresa.departamento,
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
      actividadEconomicaCodigo: empresa.actividadEconomicaCodigo ?? '',
      actividadEconomicaDescripcion: empresa.actividadEconomicaDescripcion ?? '',
    });
  }, [empresa]);

  const guardarMutation = useMutation({
    mutationFn: () =>
      api.patch(`/empresas/${empresaId}`, {
        razonSocial: form.razonSocial,
        nombreFantasia: form.nombreFantasia || undefined,
        tipoContribuyente: form.tipoContribuyente,
        regimenTributario: form.regimenTributario,
        direccion: form.direccion,
        ciudad: form.ciudad,
        departamento: form.departamento,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        actividadEconomicaCodigo: form.actividadEconomicaCodigo || undefined,
        actividadEconomicaDescripcion: form.actividadEconomicaDescripcion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa', empresaId] });
      queryClient.invalidateQueries({ queryKey: ['empresas-todas'] });
      setError(null);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
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

  const puedeGuardar = form.razonSocial && form.direccion && form.ciudad && form.departamento;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Datos de la empresa</h1>
        <p className="mt-1 text-sm text-ink-500">
          Editá los datos de la empresa activa (arriba en el menú si sos superadmin) — incluye la actividad
          económica y los datos de contacto que SIFEN exige para emitir Documentos Electrónicos.
        </p>
      </div>

      <Card>
        <CardHeader title="Datos generales" />
        <div className="p-5">
          {isLoading ? (
            <p className="text-sm text-ink-500">Cargando…</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                guardarMutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              {guardado && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</div>}

              <FormField label="RUC">
                <Input value={`${empresa?.ruc ?? ''}-${empresa?.dvRuc ?? ''}`} disabled />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Razón social" required>
                  <Input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} required />
                </FormField>
                <FormField label="Nombre de fantasía (opcional)">
                  <Input value={form.nombreFantasia} onChange={(e) => setForm({ ...form, nombreFantasia: e.target.value })} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Tipo de contribuyente" required>
                  <Select
                    value={form.tipoContribuyente}
                    onChange={(e) => setForm({ ...form, tipoContribuyente: e.target.value as TipoContribuyente })}
                  >
                    <option value="FISICA">Persona física</option>
                    <option value="JURIDICA">Persona jurídica</option>
                  </Select>
                </FormField>
                <FormField label="Régimen tributario">
                  <Select
                    value={form.regimenTributario}
                    onChange={(e) => setForm({ ...form, regimenTributario: e.target.value as RegimenTributario })}
                  >
                    <option value="IRE_GENERAL">IRE General</option>
                    <option value="IRE_SIMPLE">IRE Simple</option>
                    <option value="IRE_RESIMPLE">IRE RESIMPLE</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <FormField label="Dirección" required>
                    <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required />
                  </FormField>
                </div>
                <FormField label="Ciudad" required>
                  <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required />
                </FormField>
                <FormField label="Departamento" required>
                  <Input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} required />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Teléfono">
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </FormField>
              </div>

              <div className="border-t border-ink-100 pt-4">
                <p className="text-sm font-medium text-ink-900">Actividad económica</p>
                <p className="mt-1 text-xs text-ink-400">
                  Clasificador de Actividades Económicas de SET, tal como figura en Marangatú para este RUC — SIFEN lo
                  exige en todo Documento Electrónico (campo gActEco).
                </p>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <FormField label="Código">
                    <Input
                      value={form.actividadEconomicaCodigo}
                      onChange={(e) => setForm({ ...form, actividadEconomicaCodigo: e.target.value })}
                      placeholder="Ej: 47521"
                    />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Descripción">
                      <Input
                        value={form.actividadEconomicaDescripcion}
                        onChange={(e) => setForm({ ...form, actividadEconomicaDescripcion: e.target.value })}
                        placeholder="Ej: Comercio al por menor de artículos de ferretería"
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-ink-100 pt-3">
                <Button type="submit" disabled={!puedeGuardar || guardarMutation.isPending}>
                  {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
