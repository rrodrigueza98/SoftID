import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { formatDate, formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import type { CuentaBancaria, MovimientoBancario } from '../lib/types';

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

  const { data: movimientos, isFetching: cargandoMovimientos } = useQuery({
    queryKey: ['movimientos-bancarios', cuentaBancaria.id, { hasta: fechaCorte }],
    queryFn: async () =>
      (
        await api.get<MovimientoBancario[]>('/movimientos-bancarios', {
          params: { cuentaBancariaId: cuentaBancaria.id, hasta: fechaCorte },
        })
      ).data,
    enabled: open && Boolean(fechaCorte),
  });

  // Pendientes primero -- es lo que el usuario tiene que revisar contra el
  // extracto en papel/PDF. Los ya conciliados quedan abajo, sin ocultarlos,
  // por si hay que destildar alguno por error.
  const movimientosOrdenados = useMemo(() => {
    if (!movimientos) return [];
    return [...movimientos].sort((a, b) => {
      if (a.conciliado !== b.conciliado) return a.conciliado ? 1 : -1;
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
  }, [movimientos]);

  const pendientes = movimientos?.filter((m) => !m.conciliado).length ?? 0;

  const saldoLibros = saldoData?.saldo ?? 0;
  const diferencia = saldoExtracto ? saldoLibros - Number(saldoExtracto) : null;

  const toggleConciliado = useMutation({
    mutationFn: ({ id, conciliado }: { id: string; conciliado: boolean }) =>
      api.patch(`/movimientos-bancarios/${id}/conciliar`, { conciliado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios'] }),
  });

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
    <Dialog open={open} onClose={onClose} title={`Conciliar — ${cuentaBancaria.nombre}`} width="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Fecha de corte" required>
            <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} required autoFocus />
          </FormField>

          <div className="rounded-md bg-ink-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Saldo según libros</p>
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
        </div>

        {diferencia !== null && (
          <div className="flex items-center justify-between rounded-md border border-ink-200 px-3 py-2.5">
            <span className="text-sm text-ink-600">Diferencia</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-medium text-ink-900">{formatGs(diferencia)}</span>
              <Badge tone={diferencia === 0 ? 'success' : 'warning'}>{diferencia === 0 ? 'Cuadra' : 'No cuadra'}</Badge>
            </div>
          </div>
        )}

        <div className="rounded-md border border-ink-200">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
            <span className="text-sm font-medium text-ink-700">Movimientos hasta esta fecha</span>
            <span className="text-xs text-ink-500">
              {cargandoMovimientos
                ? 'Cargando…'
                : pendientes === 0
                  ? 'Todos conciliados'
                  : `${pendientes} pendiente${pendientes === 1 ? '' : 's'} de ${movimientos?.length ?? 0}`}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {cargandoMovimientos ? (
              <div className="px-3 py-6 text-center text-sm text-ink-400">Cargando movimientos…</div>
            ) : movimientosOrdenados.length === 0 ? (
              <EmptyState message="Sin movimientos hasta esta fecha." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Concepto</Th>
                    <Th className="text-right">Monto</Th>
                    <Th className="text-center">Conciliado</Th>
                  </tr>
                </Thead>
                <tbody>
                  {movimientosOrdenados.map((m) => (
                    <Tr key={m.id}>
                      <Td className="text-ink-500">{formatDate(m.fecha)}</Td>
                      <Td className={m.conciliado ? 'text-ink-400' : 'text-ink-800'}>{m.concepto}</Td>
                      <Td className="text-right tabular-nums">
                        {m.tipo === 'DEBITO' ? '-' : ''}
                        {formatGs(m.monto)}
                      </Td>
                      <Td className="text-center">
                        <input
                          type="checkbox"
                          checked={m.conciliado}
                          onChange={(e) => toggleConciliado.mutate({ id: m.id, conciliado: e.target.checked })}
                          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>

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
