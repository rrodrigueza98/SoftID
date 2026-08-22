import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { RucSearchBox, type ResultadoBusquedaRuc } from '../components/RucSearch';
import type { Tercero, TipoContribuyente, TipoDocumentoIdentidad, TipoTercero } from '../lib/types';

const TIPOS_DOCUMENTO: { value: TipoDocumentoIdentidad; label: string }[] = [
  { value: 'RUC', label: 'RUC' },
  { value: 'CEDULA_PARAGUAYA', label: 'Cédula paraguaya' },
  { value: 'CEDULA_EXTRANJERA', label: 'Cédula extranjera' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CARNET_RESIDENCIA', label: 'Carnet de residencia' },
  { value: 'TARJETA_DIPLOMATICA', label: 'Tarjeta diplomática' },
  { value: 'OTRO', label: 'Otro' },
];

interface FormState {
  tipo: TipoTercero;
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  dvRuc: string;
  razonSocial: string;
  nombreFantasia: string;
  tipoContribuyente: TipoContribuyente | '';
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  limiteCredito: string;
  activo: boolean;
}

function emptyForm(tipo: TipoTercero): FormState {
  return {
    tipo,
    tipoDocumento: 'CEDULA_PARAGUAYA',
    numeroDocumento: '',
    dvRuc: '',
    razonSocial: '',
    nombreFantasia: '',
    tipoContribuyente: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    email: '',
    limiteCredito: '',
    activo: true,
  };
}

export function TerceroFormDialog({
  open,
  onClose,
  tipo,
  tercero,
}: {
  open: boolean;
  onClose: () => void;
  tipo: TipoTercero;
  tercero: Tercero | null;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm(tipo));
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(tercero);

  const elegirResultadoDnit = (r: ResultadoBusquedaRuc) => {
    setForm({
      ...form,
      tipoDocumento: 'RUC',
      numeroDocumento: r.ruc,
      dvRuc: r.dv,
      razonSocial: r.razonSocial,
      tipoContribuyente: r.tipoContribuyente,
    });
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (tercero) {
      setForm({
        tipo: tercero.tipo,
        tipoDocumento: tercero.tipoDocumento,
        numeroDocumento: tercero.numeroDocumento,
        dvRuc: tercero.dvRuc ?? '',
        razonSocial: tercero.razonSocial,
        nombreFantasia: tercero.nombreFantasia ?? '',
        tipoContribuyente: tercero.tipoContribuyente ?? '',
        direccion: tercero.direccion ?? '',
        ciudad: tercero.ciudad ?? '',
        telefono: tercero.telefono ?? '',
        email: tercero.email ?? '',
        limiteCredito: tercero.cuentaCorriente?.limiteCredito ?? '',
        activo: tercero.activo,
      });
    } else {
      setForm(emptyForm(tipo));
    }
  }, [open, tercero, tipo]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empresaId,
        tipo: form.tipo,
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento,
        dvRuc: form.tipoDocumento === 'RUC' ? form.dvRuc : undefined,
        razonSocial: form.razonSocial,
        nombreFantasia: form.nombreFantasia || undefined,
        tipoContribuyente: form.tipoDocumento === 'RUC' ? form.tipoContribuyente || undefined : undefined,
        direccion: form.direccion || undefined,
        ciudad: form.ciudad || undefined,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        limiteCredito: form.limiteCredito ? Number(form.limiteCredito) : undefined,
        activo: form.activo,
      };
      if (isEdit) return api.patch(`/terceros/${tercero!.id}`, payload);
      return api.post('/terceros', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terceros'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Editar tercero' : 'Nuevo tercero'} width="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {!isEdit && <RucSearchBox onSelect={elegirResultadoDnit} />}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipo" required>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoTercero })}>
              <option value="CLIENTE">Cliente</option>
              <option value="PROVEEDOR">Proveedor</option>
              <option value="AMBOS">Ambos</option>
            </Select>
          </FormField>
          <FormField label="Tipo de documento" required>
            <Select
              value={form.tipoDocumento}
              onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value as TipoDocumentoIdentidad })}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de documento" required>
            <Input
              value={form.numeroDocumento}
              onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
              required
            />
          </FormField>
          {form.tipoDocumento === 'RUC' && (
            <FormField label="Dígito verificador">
              <Input value={form.dvRuc} onChange={(e) => setForm({ ...form, dvRuc: e.target.value })} maxLength={1} />
            </FormField>
          )}
        </div>

        {form.tipoDocumento === 'RUC' && (
          <FormField label="Tipo de contribuyente" required>
            <Select
              value={form.tipoContribuyente}
              onChange={(e) => setForm({ ...form, tipoContribuyente: e.target.value as TipoContribuyente })}
              required
            >
              <option value="" disabled>
                Elegir…
              </option>
              <option value="FISICA">Persona física</option>
              <option value="JURIDICA">Persona jurídica</option>
            </Select>
          </FormField>
        )}

        <FormField label="Razón social / Nombre" required>
          <Input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} required />
        </FormField>
        <FormField label="Nombre de fantasía">
          <Input value={form.nombreFantasia} onChange={(e) => setForm({ ...form, nombreFantasia: e.target.value })} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Dirección">
            <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </FormField>
          <FormField label="Ciudad">
            <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
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

        <FormField label="Límite de crédito (₲)">
          <Input
            type="number"
            min="0"
            value={form.limiteCredito}
            onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })}
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          Activo
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
