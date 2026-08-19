import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { StatTile } from '../components/ui/StatTile';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import type { Deposito, Producto, Stock } from '../lib/types';

const BARRA = '#4c6b8a'; // brand-600
const CURSOR = 'rgba(76,107,138,0.06)';
const GRILLA = '#ecedf0'; // ink-100

function valorFila(s: Stock) {
  return Number(s.cantidad) * Number(s.producto.precioCosto);
}

export default function PanelInventarioPage() {
  const empresaId = useEmpresaId();

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock', empresaId],
    queryFn: async () => (await api.get<Stock[]>('/stock', { params: { empresaId } })).data,
  });
  const { data: productos } = useQuery({
    queryKey: ['productos', empresaId],
    queryFn: async () => (await api.get<Producto[]>('/productos', { params: { empresaId } })).data,
  });
  const { data: depositos } = useQuery({
    queryKey: ['depositos', empresaId],
    queryFn: async () => (await api.get<Deposito[]>('/depositos', { params: { empresaId } })).data,
  });

  const valorTotal = (stock ?? []).reduce((s, row) => s + valorFila(row), 0);
  const bajoMinimo = (stock ?? []).filter(
    (s) => s.producto.stockMinimo != null && Number(s.cantidad) <= Number(s.producto.stockMinimo),
  );

  type FilaCategoria = { categoria: string; productos: Set<string>; valor: number };
  const porCategoriaMap = new Map<string, FilaCategoria>();
  for (const s of stock ?? []) {
    const nombre = s.producto.categoria?.nombre ?? 'Sin categoría';
    const fila = porCategoriaMap.get(nombre) ?? { categoria: nombre, productos: new Set<string>(), valor: 0 };
    fila.productos.add(s.productoId);
    fila.valor += valorFila(s);
    porCategoriaMap.set(nombre, fila);
  }
  const porCategoria = [...porCategoriaMap.values()]
    .map((f) => ({ categoria: f.categoria, productos: f.productos.size, valor: Math.round(f.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);

  type FilaDeposito = { deposito: string; valor: number };
  const porDepositoMap = new Map<string, FilaDeposito>();
  for (const s of stock ?? []) {
    const nombre = s.deposito.nombre;
    const fila = porDepositoMap.get(nombre) ?? { deposito: nombre, valor: 0 };
    fila.valor += valorFila(s);
    porDepositoMap.set(nombre, fila);
  }
  const porDeposito = [...porDepositoMap.values()]
    .map((f) => ({ ...f, valor: Math.round(f.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Panel de inventario</h1>
        <p className="mt-1 text-sm text-ink-500">Foto actual del stock: valor, cobertura y alertas de mínimos.</p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !stock || stock.length === 0 ? (
        <Card>
          <EmptyState message="Todavía no hay stock cargado." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Productos" value={productos?.length ?? '—'} />
            <StatTile label="Valor de stock" value={formatGs(Math.round(valorTotal * 100) / 100)} />
            <StatTile
              label="Bajo stock mínimo"
              value={bajoMinimo.length}
              tone={bajoMinimo.length > 0 ? 'warning' : 'neutral'}
            />
            <StatTile label="Depósitos" value={depositos?.filter((d) => d.activo).length ?? '—'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Valor por categoría" subtitle="Valor de stock a costo" />
              <div className="h-64 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCategoria} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLA} />
                    <XAxis
                      dataKey="categoria"
                      tick={{ fontSize: 11, fill: '#748a86' }}
                      tickLine={false}
                      axisLine={{ stroke: GRILLA }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#748a86' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) => new Intl.NumberFormat('es-PY', { notation: 'compact' }).format(v)}
                    />
                    <Tooltip
                      cursor={{ fill: CURSOR }}
                      content={
                        <ChartTooltip
                          formatearEtiqueta={(row) => ({
                            titulo: String(row.categoria),
                            lineas: [
                              `Valor: ${formatGs(row.valor as number)}`,
                              `Productos: ${row.productos as number}`,
                            ],
                          })}
                        />
                      }
                    />
                    <Bar dataKey="valor" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Valor por depósito" subtitle="Valor de stock a costo" />
              <div className="h-64 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porDeposito} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLA} />
                    <XAxis
                      dataKey="deposito"
                      tick={{ fontSize: 11, fill: '#748a86' }}
                      tickLine={false}
                      axisLine={{ stroke: GRILLA }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#748a86' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) => new Intl.NumberFormat('es-PY', { notation: 'compact' }).format(v)}
                    />
                    <Tooltip
                      cursor={{ fill: CURSOR }}
                      content={
                        <ChartTooltip
                          formatearEtiqueta={(row) => ({
                            titulo: String(row.deposito),
                            lineas: [`Valor: ${formatGs(row.valor as number)}`],
                          })}
                        />
                      }
                    />
                    <Bar dataKey="valor" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Detalle por categoría" />
            <Table>
              <Thead>
                <tr>
                  <Th>Categoría</Th>
                  <Th className="text-right">Productos</Th>
                  <Th className="text-right">Valor de stock</Th>
                </tr>
              </Thead>
              <tbody>
                {porCategoria.map((c) => (
                  <Tr key={c.categoria}>
                    <Td className="font-medium text-ink-900">{c.categoria}</Td>
                    <Td className="text-right tabular-nums">{c.productos}</Td>
                    <Td className="text-right tabular-nums">{formatGs(c.valor)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
