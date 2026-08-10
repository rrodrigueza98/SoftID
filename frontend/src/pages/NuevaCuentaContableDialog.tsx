import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { CuentaContable } from '../lib/types';

const TIPOS: { value: CuentaContable['tipo']; label: string }[] = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'PASIVO', label: 'Pasivo' },
  { value: 'PATRIMONIO', label: 'Patrimonio' },
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
];

const NATURALEZA_POR_TIPO: Record<CuentaContable['tipo'], CuentaContable['naturaleza']> = {
  ACTIVO: 'DEUDORA',
  EGRESO: 'DEUDORA',
  PASIVO: 'ACREEDORA',
  PATRIMONIO: 'ACREEDORA',
  INGRESO: 'ACREEDORA',
};

export function NuevaCuentaContableDialog({
  open,
  onClose,
  empresaId,
  cuentas,
}: {
  open: boolean;
  onClose: () => void;
  empresaId: string;
  cuentas: CuentaContable[];
}) {
  const queryClient = useQueryClient();
  const [cuentaPadreId, setCuentaPadreId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<CuentaContable['tipo']>('ACTIVO');
  const [imputable, setImputable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grupos (cuentas no imputables) son las unicas que tiene sentido elegir
  // como padre -- imputar directo bajo una cuenta imputable rompería el
  // Libro Mayor (sumaría movimientos de dos cuentas distintas juntos).
  const gruposPadre = cuentas.filter((c) => !c.imputable);
  const padre = cuentas.find((c) => c.id === cuentaPadreId);

  function elegirPadre(id: string) {
    setCuentaPadreId(id);
    const p = cuentas.find((c) => c.id === id);
    if (p) setTipo(p.tipo);
  }

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/cuentas-contables', {
        empresaId,
        codigo,
        nombre,
        tipo,
        naturaleza: NATURALEZA_POR_TIPO[tipo],
        imputable,
        cuentaPadreId: cuentaPadreId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables', empresaId] });
      setCuentaPadreId('');
      setCodigo('');
      setNombre('');
      setTipo('ACTIVO');
      setImputable(true);
      setError(null);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const puedeGuardar = codigo.trim() && nombre.trim();

  return (
    <Dialog open={open} onClose={onClose} title="Nueva cuenta" width="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField label="Cuenta padre (grupo)">
          <Select value={cuentaPadreId} onChange={(e) => elegirPadre(e.target.value)}>
            <option value="">Sin cuenta padre (cuenta de primer nivel)</option>
            {gruposPadre.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </Select>
          {padre && (
            <p className="mt-1 text-xs text-ink-400">
              Ej: agregá "Banco Itaú" o "Banco Continental" bajo un grupo como "BANCOS" para que cada banco tenga su
              propia cuenta y sus movimientos no se mezclen.
            </p>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Código" required>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: 1-01-01-03-02"
              required
              autoFocus
            />
          </FormField>
          <FormField label="Tipo" required>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as CuentaContable['tipo'])} disabled={!!padre}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Nombre" required>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Banco Itaú Cta Cte"
            required
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={imputable} onChange={(e) => setImputable(e.target.checked)} />
          Es una cuenta imputable (se le pueden cargar movimientos directamente)
        </label>
        {!imputable && (
          <p className="-mt-2 text-xs text-ink-400">
            Desmarcá esto solo si es un grupo/rubro que agrupa subcuentas (ej. "BANCOS"), no una cuenta real.
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeGuardar || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
