import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDateTime } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Field';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import type { MovimientoStock, Producto, Stock } from '../lib/types';

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

export function StockPorProductoCard() {
  const empresaId = useEmpresaId();
  const [productoId, setProductoId] = useState('');

  const { data: productos } = useQuery({
    queryKey: ['productos-select', empresaId],
    queryFn: async () => (await api.get<Producto[]>('/productos', { params: { empresaId } })).data,
  });

  const { data: stockProducto, isLoading: loadingStock } = useQuery({
    queryKey: ['stock', empresaId, productoId],
    queryFn: async () => (await api.get<Stock[]>('/stock', { params: { empresaId, productoId } })).data,
    enabled: Boolean(productoId),
  });

  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['movimientos-stock', { empresaId, productoId, limit: 8 }],
    queryFn: async () =>
      (await api.get<MovimientoStock[]>('/movimientos-stock', { params: { empresaId, productoId, limit: 8 } })).data,
    enabled: Boolean(productoId),
  });

  const producto = productos?.find((p) => p.id === productoId);
  const filas = stockProducto ?? [];
  const total = filas.reduce((sum, s) => sum + Number(s.cantidad), 0);
  const maxCantidad = Math.max(...(stockProducto ?? []).map((s) => Number(s.cantidad)), 1);
  const bajoMinimo = producto?.stockMinimo != null && total <= Number(producto.stockMinimo);

  return (
    <Card>
      <CardHeader
        title="Stock por producto"
        subtitle="Elegí un producto para ver su desglose por depósito"
        actions={
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-72">
            <option value="">Elegir producto…</option>
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.descripcion}
              </option>
            ))}
          </Select>
        }
      />

      {!productoId ? (
        <EmptyState message="Elegí un producto arriba para ver su stock." />
      ) : loadingStock ? (
        <PageSpinner />
      ) : (
        <div className="p-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Stock total</p>
              <p className="mt-1 text-3xl font-semibold text-ink-900">
                {total} <span className="text-base font-normal text-ink-400">{producto?.unidadMedida?.descripcion}</span>
              </p>
            </div>
            {producto?.stockMinimo != null && (
              <Badge tone={bajoMinimo ? 'warning' : 'success'}>
                {bajoMinimo ? 'Bajo mínimo' : 'Sobre mínimo'} · mín. {producto.stockMinimo}
              </Badge>
            )}
          </div>

          {filas.length === 0 ? (
            <EmptyState message="Este producto todavía no tiene stock en ningún depósito." />
          ) : (
            <div className="flex flex-col gap-2.5" role="img" aria-label={`Stock de ${producto?.descripcion} por depósito`}>
              {filas.map((s) => {
                const cantidad = Number(s.cantidad);
                const pct = cantidad <= 0 ? 0 : Math.max((cantidad / maxCantidad) * 100, 2);
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-ink-600" title={s.deposito.nombre}>
                      {s.deposito.nombre}
                    </span>
                    <div className="h-5 flex-1 rounded-sm bg-ink-100">
                      <div
                        className="h-5 rounded-r-sm bg-brand-600 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-ink-800">
                      {s.cantidad}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Últimos movimientos</p>
            {loadingMovimientos ? (
              <PageSpinner />
            ) : !movimientos || movimientos.length === 0 ? (
              <EmptyState message="Sin movimientos todavía para este producto." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Tipo</Th>
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
                      <Td className="text-ink-500">{m.deposito.nombre}</Td>
                      <Td className="text-right tabular-nums">{m.cantidad}</Td>
                      <Td className="text-right tabular-nums">{m.cantidadNueva}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
