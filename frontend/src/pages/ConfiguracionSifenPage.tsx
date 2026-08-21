import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { useEmpresaId } from '../lib/hooks';
import { formatDateTime } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select, FormField } from '../components/ui/Field';
import type { AmbienteSifen, CertificadoSifenMetadata } from '../lib/types';

const emptyForm = { ambiente: 'TEST' as AmbienteSifen, password: '', csc: '', idCsc: '' };

export default function ConfiguracionSifenPage() {
  const { esAdmin } = useAuth();
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [archivoElegido, setArchivoElegido] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: metadata, isLoading } = useQuery({
    queryKey: ['sifen-certificado', empresaId],
    queryFn: async () => (await api.get<CertificadoSifenMetadata | null>('/sifen/certificados', { params: { empresaId } })).data,
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!archivoElegido) throw new Error('Elegí el archivo .p12/.pfx del certificado');
      const formData = new FormData();
      formData.append('file', archivoElegido);
      formData.append('ambiente', form.ambiente);
      formData.append('password', form.password);
      if (form.csc) formData.append('csc', form.csc);
      if (form.idCsc) formData.append('idCsc', form.idCsc);
      return api.post('/sifen/certificados', formData, { params: { empresaId } });
    },
    onSuccess: () => {
      setError(null);
      setForm(emptyForm);
      setArchivoElegido(null);
      queryClient.invalidateQueries({ queryKey: ['sifen-certificado', empresaId] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function handleArchivoSeleccionado(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setArchivoElegido(file);
  }

  if (!esAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-500">Esta sección es solo para administradores.</p>
      </Card>
    );
  }

  const vencido = metadata?.fechaVencimiento ? new Date(metadata.fechaVencimiento).getTime() < Date.now() : false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Firma digital SIFEN</h1>
        <p className="mt-1 text-sm text-ink-500">
          Certificado propio de la empresa (.p12/.pfx) usado para firmar y enviar los Documentos Electrónicos a SIFEN.
          Se guarda cifrado — nunca se vuelve a mostrar el archivo ni la contraseña.
        </p>
      </div>

      {metadata && (
        <Card>
          <CardHeader title="Certificado actual" />
          <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Ambiente</p>
              <p className="mt-1">
                <Badge tone={metadata.ambiente === 'PRODUCCION' ? 'success' : 'warning'}>
                  {metadata.ambiente === 'PRODUCCION' ? 'Producción' : 'Prueba'}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Titular</p>
              <p className="mt-1 text-sm text-ink-900">{metadata.subjectCn || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Vencimiento</p>
              <p className="mt-1 text-sm text-ink-900">
                {metadata.fechaVencimiento ? formatDateTime(metadata.fechaVencimiento) : '—'}
                {vencido && <Badge tone="danger">Vencido</Badge>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">CSC cargado</p>
              <p className="mt-1">
                <Badge tone={metadata.tieneCsc ? 'success' : 'neutral'}>{metadata.tieneCsc ? 'Sí' : 'No'}</Badge>
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && (
        <Card>
          <CardHeader
            title={metadata ? 'Reemplazar certificado' : 'Cargar certificado'}
            subtitle="El archivo .p12/.pfx y la contraseña se cifran antes de guardarse -- nunca se vuelven a mostrar."
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              upload.mutate();
            }}
            className="flex flex-col gap-4 px-5 py-4"
          >
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ambiente" required>
                <Select value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value as AmbienteSifen })}>
                  <option value="TEST">Prueba (homologación)</option>
                  <option value="PRODUCCION">Producción</option>
                </Select>
              </FormField>
              <FormField label="Archivo .p12 / .pfx" required>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Elegir archivo
                  </Button>
                  <span className="truncate text-sm text-ink-600">{archivoElegido?.name ?? 'Ningún archivo elegido'}</span>
                  <input ref={fileInputRef} type="file" accept=".p12,.pfx" className="hidden" onChange={handleArchivoSeleccionado} />
                </div>
              </FormField>
            </div>

            <FormField label="Contraseña del certificado" required>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4 rounded-md border border-ink-200 bg-ink-50 p-4">
              <FormField label="CSC (Código de Seguridad del Contribuyente, opcional)">
                <Input type="password" value={form.csc} onChange={(e) => setForm({ ...form, csc: e.target.value })} autoComplete="new-password" />
              </FormField>
              <FormField label="ID del CSC (opcional)">
                <Input value={form.idCsc} onChange={(e) => setForm({ ...form, idCsc: e.target.value })} />
              </FormField>
              <p className="col-span-full text-xs text-ink-500">
                El CSC lo emite SET junto con el certificado y se usa para generar el código QR del KUDE. Sin CSC, los
                Documentos Electrónicos igual se firman y envían, pero el KUDE no muestra QR.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!archivoElegido || upload.isPending}>
                {upload.isPending ? 'Guardando…' : metadata ? 'Reemplazar certificado' : 'Guardar certificado'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
