import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDateTime } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { DepositoFormDialog } from './DepositoFormDialog';
import { MovimientoStockFormDialog } from './MovimientoStockFormDialog';
import { StockPorProductoCard } from './StockPorProductoCard';
import type { Deposito, MovimientoStock, Stock } from '../lib/types';

const TIPO_LABEL: Record<string, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (−)',
  TRANSFERENCIA_SALIDA: 'Transferencia (salida)',
  TRANSFERENCIA_ENTRADA: 'Transferencia (entrada)',
  DEVOLUCION_COMPRA: 'Devolución a proveedor',
  DEVOLUCION_VENTA: 'Devolución de venta',
  INVENTARIO_INICIAL: 'Inventario inicial',
};

export default function StockPage() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [depositoDialogOpen, setDepositoDialogOpen] = useState(false);
  const [movimientoDialogOpen, setMovimientoDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: depositos, isLoading: loadingDepositos } = useQuery({
    queryKey: ['depositos', empresaId],
    queryFn: async () => (await api.get<Deposito[]>('/depositos', { params: { empresaId } })).data,
  });

  const eliminarDeposito = useMutation({
    mutationFn: (id: string) => api.delete(`/depositos/${id}`),
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['depositos', empresaId] });
    },
    onError: (err) => setDeleteError(apiErrorMessage(err)),
  });

  function confirmarEliminar(deposito: Deposito) {
    if (window.confirm(`¿Eliminar el depósito "${deposito.nombre}"? Esta acción no se puede deshacer.`)) {
      eliminarDeposito.mutate(deposito.id);
    }
  }

  const { data: saldo, isLoading: loadingSaldo } = useQuery({
    queryKey: ['stock', empresaId],
    queryFn: async () => (await api.get<Stock[]>('/stock', { params: { empresaId } })).data,
  });

  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['movimientos-stock', { empresaId, limit: 20 }],
    queryFn: async () =>
      (await api.get<MovimientoStock[]>('/movimientos-stock', { params: { empresaId, limit: 20 } })).data,
  });

  const hayDepositos = (depositos?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Stock</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDepositoDialogOpen(true)}>
            Nuevo depósito
          </Button>
          <Button onClick={() => setMovimientoDialogOpen(true)} disabled={!hayDepositos}>
            Registrar movimiento
          </Button>
        </div>
      </div>

      {!loadingDepositos && !hayDepositos && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no creaste ningún depósito — necesitás al menos uno para poder cargar stock.
        </div>
      )}

      {hayDepositos && (
        <Card>
          <CardHeader title="Depósitos" />
          {deleteError && (
            <div className="mx-5 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</div>
          )}
          <ul className="divide-y divide-ink-100">
            {depositos!.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-ink-800">
                  {d.nombre}
                  {d.esPrincipal && <span className="ml-2 text-xs text-ink-400">(principal)</span>}
                </span>
                <button
                  onClick={() => confirmarEliminar(d)}
                  disabled={eliminarDeposito.isPending}
                  className="text-xs font-medium text-ink-400 hover:text-red-600 disabled:opacity-40"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <StockPorProductoCard />

      <Card>
        <CardHeader title="Saldo actual" subtitle="Por producto y depósito" />
        {loadingSaldo ? (
          <PageSpinner />
        ) : !saldo || saldo.length === 0 ? (
          <EmptyState message="Sin movimientos todavía." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Producto</Th>
                <Th>Depósito</Th>
                <Th className="text-right">Cantidad</Th>
                <Th>Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {saldo.map((s) => {
                const bajoMinimo =
                  s.producto.stockMinimo != null && Number(s.cantidad) <= Number(s.producto.stockMinimo);
                return (
                  <Tr key={s.id}>
                    <Td className="font-medium text-ink-900">{s.producto.descripcion}</Td>
                    <Td className="text-ink-500">{s.deposito.nombre}</Td>
                    <Td className="text-right tabular-nums">{s.cantidad}</Td>
                    <Td>
                      {bajoMinimo ? (
                        <Badge tone="warning">Bajo mínimo</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Últimos movimientos" subtitle="Kardex — 20 más recientes" />
        {loadingMovimientos ? (
          <PageSpinner />
        ) : !movimientos || movimientos.length === 0 ? (
          <EmptyState message="Sin movimientos todavía." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tipo</Th>
                <Th>Producto</Th>
                <Th>Depósito</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Saldo resultante</Th>
              </tr>
            </Thead>
            <tbody>
              {movimientos.map((m) => (
                <Tr key={m.id}>
                  <Td className="text-ink-500">{formatDateTime(m.fecha)}</Td>
                  <Td>{TIPO_LABEL[m.tipo] ?? m.tipo}</Td>
                  <Td className="font-medium text-ink-900">{m.producto.descripcion}</Td>
                  <Td className="text-ink-500">{m.deposito.nombre}</Td>
                  <Td className="text-right tabular-nums">{m.cantidad}</Td>
                  <Td className="text-right tabular-nums">{m.cantidadNueva}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <DepositoFormDialog open={depositoDialogOpen} onClose={() => setDepositoDialogOpen(false)} />
      <MovimientoStockFormDialog
        open={movimientoDialogOpen}
        onClose={() => setMovimientoDialogOpen(false)}
        depositos={depositos ?? []}
      />
    </div>
  );
}
