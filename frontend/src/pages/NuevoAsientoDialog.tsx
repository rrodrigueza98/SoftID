import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { CuentaContable } from '../lib/types';

interface FilaAsiento {
  cuentaId: string;
  debe: string;
  haber: string;
  glosa: string;
}

const filaVacia = (): FilaAsiento => ({ cuentaId: '', debe: '', haber: '', glosa: '' });

export function NuevoAsientoDialog({
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
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [filas, setFilas] = useState<FilaAsiento[]>([filaVacia(), filaVacia()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFecha(new Date().toISOString().slice(0, 10));
    setConcepto('');
    setFilas([filaVacia(), filaVacia()]);
    setError(null);
  }, [open]);

  const cuentasImputables = cuentas.filter((c) => c.imputable);

  const totalDebe = filas.reduce((s, f) => s + (Number(f.debe) || 0), 0);
  const totalHaber = filas.reduce((s, f) => s + (Number(f.haber) || 0), 0);
  const balanceado = filas.length >= 2 && totalDebe === totalHaber && totalDebe > 0;

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/asientos-contables', {
        empresaId,
        fecha,
        concepto,
        detalles: filas
          .filter((f) => f.cuentaId && (Number(f.debe) > 0 || Number(f.haber) > 0))
          .map((f) => ({ cuentaId: f.cuentaId, debe: Number(f.debe) || 0, haber: Number(f.haber) || 0, glosa: f.glosa || undefined })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asientos-contables'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sumas-saldos'] });
      queryClient.invalidateQueries({ queryKey: ['libro-mayor'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function actualizarFila(idx: number, cambios: Partial<FilaAsiento>) {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...cambios } : f)));
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo asiento contable" width="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3">
          <FormField label="Fecha" required>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </FormField>
          <FormField label="Concepto" required>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Pago de alquiler" required />
          </FormField>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_140px_140px_1fr_32px] gap-2 text-xs font-medium uppercase tracking-wide text-ink-500">
            <span>Cuenta</span>
            <span>Debe</span>
            <span>Haber</span>
            <span>Glosa (opcional)</span>
            <span />
          </div>
          {filas.map((fila, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_140px_140px_1fr_32px] gap-2">
              <Select value={fila.cuentaId} onChange={(e) => actualizarFila(idx, { cuentaId: e.target.value })} required>
                <option value="">Elegir cuenta…</option>
                {cuentasImputables.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} {c.nombre}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fila.debe}
                onChange={(e) => actualizarFila(idx, { debe: e.target.value, haber: e.target.value ? '' : fila.haber })}
                placeholder="0"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={fila.haber}
                onChange={(e) => actualizarFila(idx, { haber: e.target.value, debe: e.target.value ? '' : fila.debe })}
                placeholder="0"
              />
              <Input value={fila.glosa} onChange={(e) => actualizarFila(idx, { glosa: e.target.value })} placeholder="Detalle de la línea" />
              <button
                type="button"
                onClick={() => setFilas((prev) => prev.filter((_, i) => i !== idx))}
                disabled={filas.length <= 2}
                className="text-ink-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Quitar línea"
              >
                ✕
              </button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setFilas((prev) => [...prev, filaVacia()])}>
            + Agregar línea
          </Button>
        </div>

        <div className="flex items-center justify-end gap-6 border-t border-ink-100 pt-3 text-sm">
          <span className="text-ink-500">
            Debe: <span className="font-medium text-ink-900">{formatGs(totalDebe)}</span>
          </span>
          <span className="text-ink-500">
            Haber: <span className="font-medium text-ink-900">{formatGs(totalHaber)}</span>
          </span>
          {!balanceado && (totalDebe > 0 || totalHaber > 0) && (
            <span className="font-medium text-red-600">El asiento no está balanceado</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!balanceado || !concepto || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Registrar asiento'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
