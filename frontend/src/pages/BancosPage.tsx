import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { CuentaBancariaFormDialog } from './CuentaBancariaFormDialog';
import { MovimientoBancarioFormDialog } from './MovimientoBancarioFormDialog';
import { ConciliarCuentaDialog } from './ConciliarCuentaDialog';
import type { ConciliacionBancaria, CuentaBancaria, MovimientoBancario } from '../lib/types';

const TIPO_CUENTA_LABEL: Record<CuentaBancaria['tipoCuenta'], string> = {
  CUENTA_CORRIENTE: 'Cuenta corriente',
  CAJA_AHORRO: 'Caja de ahorro',
};

export default function BancosPage() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [seleccionada, setSeleccionada] = useState<CuentaBancaria | null>(null);
  const [cuentaDialogOpen, setCuentaDialogOpen] = useState(false);
  const [movimientoDialogOpen, setMovimientoDialogOpen] = useState(false);
  const [conciliarDialogOpen, setConciliarDialogOpen] = useState(false);

  const { data: cuentas, isLoading: loadingCuentas } = useQuery({
    queryKey: ['cuentas-bancarias', empresaId],
    queryFn: async () => (await api.get<CuentaBancaria[]>('/cuentas-bancarias', { params: { empresaId } })).data,
  });

  const { data: saldoData, isLoading: loadingSaldo } = useQuery({
    queryKey: ['cuenta-bancaria-saldo', seleccionada?.id, 'actual'],
    queryFn: async () => (await api.get<{ saldo: number }>(`/cuentas-bancarias/${seleccionada!.id}/saldo`)).data,
    enabled: Boolean(seleccionada),
  });

  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['movimientos-bancarios', seleccionada?.id],
    queryFn: async () =>
      (await api.get<MovimientoBancario[]>('/movimientos-bancarios', { params: { cuentaBancariaId: seleccionada!.id } }))
        .data,
    enabled: Boolean(seleccionada),
  });

  const { data: conciliaciones } = useQuery({
    queryKey: ['conciliaciones-bancarias', seleccionada?.id],
    queryFn: async () =>
      (await api.get<ConciliacionBancaria[]>('/conciliaciones-bancarias', { params: { cuentaBancariaId: seleccionada!.id } }))
        .data,
    enabled: Boolean(seleccionada),
  });

  const toggleConciliado = useMutation({
    mutationFn: ({ id, conciliado }: { id: string; conciliado: boolean }) =>
      api.patch(`/movimientos-bancarios/${id}/conciliar`, { conciliado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios', seleccionada?.id] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Bancos</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Cuentas bancarias" />
          {loadingCuentas ? (
            <PageSpinner />
          ) : !cuentas || cuentas.length === 0 ? (
            <EmptyState message="Sin cuentas bancarias todavía." />
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {cuentas.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSeleccionada(c)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                      seleccionada?.id === c.id ? 'bg-brand-50' : 'hover:bg-ink-50'
                    }`}
                  >
                    <span className="font-medium text-ink-900">{c.nombre}</span>
                    <span className="text-xs text-ink-400">
                      {c.banco} · {c.numeroCuenta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-ink-100 p-3">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setCuentaDialogOpen(true)}>
              + Nueva cuenta
            </Button>
          </div>
        </Card>

        {!seleccionada ? (
          <Card className="flex h-64 items-center justify-center">
            <p className="text-sm text-ink-400">Elegí una cuenta bancaria para ver sus movimientos.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{seleccionada.nombre}</h2>
                  <p className="text-sm text-ink-500">
                    {seleccionada.banco} · {seleccionada.numeroCuenta} ·{' '}
                    <span className="text-ink-400">{TIPO_CUENTA_LABEL[seleccionada.tipoCuenta]}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setMovimientoDialogOpen(true)}>
                    Registrar movimiento
                  </Button>
                  <Button onClick={() => setConciliarDialogOpen(true)}>Conciliar</Button>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Saldo actual</p>
                {loadingSaldo ? (
                  <div className="mt-2 h-8 w-32 animate-pulse rounded bg-ink-100" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">
                    {saldoData ? formatGs(saldoData.saldo) : '—'}
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Movimientos" />
              {loadingMovimientos ? (
                <PageSpinner />
              ) : !movimientos || movimientos.length === 0 ? (
                <EmptyState message="Sin movimientos todavía." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Concepto</Th>
                      <Th>Referencia</Th>
                      <Th>Tipo</Th>
                      <Th className="text-right">Monto</Th>
                      <Th className="text-center">Conciliado</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <Tr key={m.id}>
                        <Td className="text-ink-500">{formatDate(m.fecha)}</Td>
                        <Td className="text-ink-800">{m.concepto}</Td>
                        <Td className="text-ink-500">{m.referencia ?? '—'}</Td>
                        <Td>
                          <Badge tone={m.tipo === 'DEBITO' ? 'warning' : 'success'}>
                            {m.tipo === 'DEBITO' ? 'Débito' : 'Crédito'}
                          </Badge>
                        </Td>
                        <Td className="text-right tabular-nums">{formatGs(m.monto)}</Td>
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
            </Card>

            <Card>
              <CardHeader title="Historial de conciliaciones" />
              {!conciliaciones || conciliaciones.length === 0 ? (
                <EmptyState message="Todavía no se hizo ninguna conciliación." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Fecha de corte</Th>
                      <Th className="text-right">Saldo libros</Th>
                      <Th className="text-right">Saldo extracto</Th>
                      <Th className="text-right">Diferencia</Th>
                      <Th>Observación</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {conciliaciones.map((c) => (
                      <Tr key={c.id}>
                        <Td className="text-ink-500">{formatDate(c.fechaCorte)}</Td>
                        <Td className="text-right tabular-nums">{formatGs(c.saldoLibros)}</Td>
                        <Td className="text-right tabular-nums">{formatGs(c.saldoExtracto)}</Td>
                        <Td className="text-right tabular-nums">
                          <Badge tone={Number(c.diferencia) === 0 ? 'success' : 'warning'}>
                            {formatGs(c.diferencia)}
                          </Badge>
                        </Td>
                        <Td className="text-ink-500">{c.observacion ?? '—'}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        )}
      </div>

      <CuentaBancariaFormDialog open={cuentaDialogOpen} onClose={() => setCuentaDialogOpen(false)} />
      {seleccionada && (
        <>
          <MovimientoBancarioFormDialog
            open={movimientoDialogOpen}
            onClose={() => setMovimientoDialogOpen(false)}
            cuentaBancaria={seleccionada}
          />
          <ConciliarCuentaDialog
            open={conciliarDialogOpen}
            onClose={() => setConciliarDialogOpen(false)}
            cuentaBancaria={seleccionada}
          />
        </>
      )}
    </div>
  );
}
