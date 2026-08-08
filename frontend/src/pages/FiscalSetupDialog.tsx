import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { TIPO_DOCUMENTO_LABEL } from './comprobante-labels';
import type { Establecimiento, PuntoExpedicion, TipoDocumentoElectronico } from '../lib/types';

const TIPOS_DOCUMENTO = (
  ['FACTURA_ELECTRONICA', 'NOTA_CREDITO_ELECTRONICA', 'NOTA_DEBITO_ELECTRONICA', 'AUTOFACTURA_ELECTRONICA', 'NOTA_REMISION_ELECTRONICA'] as TipoDocumentoElectronico[]
).map((value) => ({ value, label: TIPO_DOCUMENTO_LABEL[value] }));

export function FiscalSetupDialog({
  open,
  onClose,
  tipoDocumentoSugerido,
}: {
  open: boolean;
  onClose: () => void;
  tipoDocumentoSugerido: TipoDocumentoElectronico;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: establecimientos } = useQuery({
    queryKey: ['establecimientos', empresaId],
    queryFn: async () => (await api.get<Establecimiento[]>('/establecimientos', { params: { empresaId } })).data,
    enabled: open,
  });

  const establecimientoExistente = establecimientos?.[0];

  const { data: puntosExpedicion } = useQuery({
    queryKey: ['puntos-expedicion', establecimientoExistente?.id],
    queryFn: async () =>
      (await api.get<PuntoExpedicion[]>('/puntos-expedicion', { params: { establecimientoId: establecimientoExistente!.id } }))
        .data,
    enabled: open && Boolean(establecimientoExistente),
  });

  const puntoExpedicionExistente = puntosExpedicion?.[0];

  // Formularios de cada paso (solo se usan si hace falta crear ese nivel).
  const [nombreEstablecimiento, setNombreEstablecimiento] = useState('Casa Matriz');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');

  const [descripcionPE, setDescripcionPE] = useState('Caja principal');

  const [numeroTimbrado, setNumeroTimbrado] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoElectronico>(tipoDocumentoSugerido);
  const [esElectronico, setEsElectronico] = useState(true);
  const [numeroDesde, setNumeroDesde] = useState('1');
  const [numeroHasta, setNumeroHasta] = useState('9999999');
  const [fechaInicioVigencia, setFechaInicioVigencia] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setError(null);
      setTipoDocumento(tipoDocumentoSugerido);
      setEsElectronico(true);
    }
  }, [open, tipoDocumentoSugerido]);

  const crearEstablecimiento = useMutation({
    mutationFn: () =>
      api.post<Establecimiento>('/establecimientos', {
        empresaId,
        codigo: '001',
        nombre: nombreEstablecimiento,
        direccion,
        ciudad,
        departamento,
        esCasaMatriz: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['establecimientos', empresaId] }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const crearPuntoExpedicion = useMutation({
    mutationFn: () =>
      api.post<PuntoExpedicion>('/puntos-expedicion', {
        establecimientoId: establecimientoExistente!.id,
        codigo: '001',
        descripcion: descripcionPE,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['puntos-expedicion', establecimientoExistente?.id] }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const crearTimbrado = useMutation({
    mutationFn: () =>
      api.post('/timbrados', {
        puntoExpedicionId: puntoExpedicionExistente!.id,
        numeroTimbrado,
        tipoDocumento,
        esElectronico,
        numeroDesde: Number(numeroDesde),
        numeroHasta: Number(numeroHasta),
        fechaInicioVigencia: new Date(fechaInicioVigencia).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timbrados-disponibles'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const paso = !establecimientoExistente ? 1 : !puntoExpedicionExistente ? 2 : 3;

  return (
    <Dialog open={open} onClose={onClose} title="Configuración fiscal" width="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Antes de emitir necesitás un establecimiento, un punto de expedición y un timbrado vigente. Paso {paso} de 3.
        </p>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {paso === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearEstablecimiento.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-sm font-semibold text-ink-800">1. Establecimiento (código 001)</h3>
            <FormField label="Nombre" required>
              <Input value={nombreEstablecimiento} onChange={(e) => setNombreEstablecimiento(e.target.value)} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Dirección" required>
                <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
              </FormField>
              <FormField label="Ciudad" required>
                <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Departamento" required>
              <Input value={departamento} onChange={(e) => setDepartamento(e.target.value)} required />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" disabled={crearEstablecimiento.isPending}>
                {crearEstablecimiento.isPending ? 'Guardando…' : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {paso === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearPuntoExpedicion.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-sm font-semibold text-ink-800">2. Punto de expedición (código 001)</h3>
            <p className="text-xs text-ink-400">Establecimiento: {establecimientoExistente!.nombre}</p>
            <FormField label="Descripción" required>
              <Input value={descripcionPE} onChange={(e) => setDescripcionPE(e.target.value)} required />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" disabled={crearPuntoExpedicion.isPending}>
                {crearPuntoExpedicion.isPending ? 'Guardando…' : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {paso === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              crearTimbrado.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-sm font-semibold text-ink-800">3. Timbrado</h3>
            <p className="text-xs text-ink-400">
              {establecimientoExistente!.nombre} · PE {puntoExpedicionExistente!.codigo}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Número de timbrado (8 dígitos)" required>
                <Input
                  value={numeroTimbrado}
                  onChange={(e) => setNumeroTimbrado(e.target.value)}
                  maxLength={8}
                  required
                />
              </FormField>
              <FormField label="Tipo de documento" required>
                <Select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoElectronico)}>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Régimen">
              <Select value={esElectronico ? '1' : '0'} onChange={(e) => setEsElectronico(e.target.value === '1')}>
                <option value="1">Electrónico (SIFEN)</option>
                <option value="0">Tradicional (preimpreso/virtual, sin exigencias SIFEN)</option>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Numeración desde" required>
                <Input type="number" min="1" value={numeroDesde} onChange={(e) => setNumeroDesde(e.target.value)} required />
              </FormField>
              <FormField label="Numeración hasta" required>
                <Input
                  type="number"
                  min="1"
                  value={numeroHasta}
                  onChange={(e) => setNumeroHasta(e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Vigente desde" required>
              <Input
                type="date"
                value={fechaInicioVigencia}
                onChange={(e) => setFechaInicioVigencia(e.target.value)}
                required
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crearTimbrado.isPending}>
                {crearTimbrado.isPending ? 'Guardando…' : 'Guardar timbrado'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
