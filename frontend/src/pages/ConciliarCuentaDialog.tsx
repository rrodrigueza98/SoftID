import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import type { CuentaBancaria } from '../lib/types';

export function ConciliarCuentaDialog({
  open,
  onClose,
  cuentaBancaria,
}: {
  open: boolean;
  onClose: () => void;
  cuentaBancaria: CuentaBancaria;
}) {
  const queryClient = useQueryClient();
  const [fechaCorte, setFechaCorte] = useState(() => new Date().toISOString().slice(0, 10));
  const [saldoExtracto, setSaldoExtracto] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: saldoData, isFetching: calculandoSaldo } = useQuery({
    queryKey: ['cuenta-bancaria-saldo', cuentaBancaria.id, fechaCorte],
    queryFn: async () =>
      (await api.get<{ saldo: number }>(`/cuentas-bancarias/${cuentaBancaria.id}/saldo`, { params: { hasta: fechaCorte } }))
        .data,
    enabled: open && Boolean(fechaCorte),
  });

  const saldoLibros = saldoData?.saldo ?? 0;
  const diferencia = saldoExtracto ? saldoLibros - Number(saldoExtracto) : null;

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/conciliaciones-bancarias', {
        cuentaBancariaId: cuentaBancaria.id,
        fechaCorte,
        saldoExtracto: Number(saldoExtracto),
        observacion: observacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliaciones-bancarias', cuentaBancaria.id] });
      setSaldoExtracto('');
      setObservacion('');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const puedeConciliar = fechaCorte && saldoExtracto !== '';

  return (
    <Dialog open={open} onClose={onClose} title={`Conciliar — ${cuentaBancaria.nombre}`} width="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField label="Fecha de corte" required>
          <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} required autoFocus />
        </FormField>

        <div className="rounded-md bg-ink-50 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Saldo según libros (a la fecha de corte)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink-900">
            {calculandoSaldo ? '…' : formatGs(saldoLibros)}
          </p>
        </div>

        <FormField label="Saldo según extracto bancario (₲)" required>
          <Input
            type="number"
            step="0.01"
            value={saldoExtracto}
            onChange={(e) => setSaldoExtracto(e.target.value)}
            required
          />
        </FormField>

        {diferencia !== null && (
          <div className="flex items-center justify-between rounded-md border border-ink-200 px-3 py-2.5">
            <span className="text-sm text-ink-600">Diferencia</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-medium text-ink-900">{formatGs(diferencia)}</span>
              <Badge tone={diferencia === 0 ? 'success' : 'warning'}>{diferencia === 0 ? 'Cuadra' : 'No cuadra'}</Badge>
            </div>
          </div>
        )}

        <FormField label="Observación (opcional)">
          <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </FormField>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeConciliar || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar conciliación'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
