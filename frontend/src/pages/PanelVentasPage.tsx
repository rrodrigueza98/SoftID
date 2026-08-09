import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, FormField } from '../components/ui/Field';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { StatTile } from '../components/ui/StatTile';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import type { PanelVentas } from '../lib/types';

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// Colores en un solo lugar: una sola serie de "monto" en ambos graficos, asi
// que no hace falta leyenda (el titulo de cada tarjeta ya dice que se grafica).
const BARRA = '#0078d4'; // brand-600
const CURSOR = 'rgba(0,120,212,0.06)'; // brand-600 al 6%
const GRILLA = '#e4e9e8'; // ink-100

export default function PanelVentasPage() {
  const empresaId = useEmpresaId();
  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(hoy());

  const { data, isLoading } = useQuery({
    queryKey: ['panel-ventas', { empresaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<PanelVentas>('/comprobantes/panel-ventas', { params: { empresaId, desde, hasta } })).data,
  });

  const porFecha = (data?.porFecha ?? []).map((f) => ({ ...f, etiqueta: formatDate(f.fecha) }));
  const porProducto = data?.porProducto ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Panel de ventas</h1>
          <p className="mt-1 text-sm text-ink-500">Resumen de ventas emitidas en el rango seleccionado.</p>
        </div>
        <div className="flex items-end gap-3">
          <FormField label="Desde">
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </FormField>
          <FormField label="Hasta">
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </FormField>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data || data.totalVentas === 0 ? (
        <Card>
          <EmptyState message="No hay ventas emitidas en el rango seleccionado." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Ventas emitidas" value={data.totalVentas} />
            <StatTile label="Monto facturado" value={formatGs(data.montoTotal)} />
            <StatTile label="Ticket promedio" value={formatGs(data.ticketPromedio)} />
            <StatTile label="Ventas a crédito" value={`${data.porcentajeCredito.toFixed(1).replace('.', ',')} %`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Ventas por fecha" subtitle="Monto facturado por día" />
              <div className="h-64 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porFecha} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLA} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fontSize: 11, fill: '#748a86' }}
                      tickLine={false}
                      axisLine={{ stroke: GRILLA }}
                      interval="preserveStartEnd"
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
                            titulo: String(row.etiqueta),
                            lineas: [
                              `Monto: ${formatGs(row.monto as number)}`,
                              `Comprobantes: ${row.cantidad as number}`,
                            ],
                          })}
                        />
                      }
                    />
                    <Bar dataKey="monto" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Top productos" subtitle="Monto facturado por producto" />
              <div className="h-64 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porProducto} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLA} />
                    <XAxis
                      dataKey="descripcion"
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
                            titulo: String(row.descripcion),
                            lineas: [`Monto: ${formatGs(row.monto as number)}`, `Cantidad: ${row.cantidad as number}`],
                          })}
                        />
                      }
                    />
                    <Bar dataKey="monto" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Detalle por producto" />
            <Table>
              <Thead>
                <tr>
                  <Th>Producto</Th>
                  <Th className="text-right">Cantidad</Th>
                  <Th className="text-right">Monto</Th>
                </tr>
              </Thead>
              <tbody>
                {porProducto.map((p) => (
                  <Tr key={p.productoId}>
                    <Td className="font-medium text-ink-900">{p.descripcion}</Td>
                    <Td className="text-right tabular-nums">{p.cantidad}</Td>
                    <Td className="text-right tabular-nums">{formatGs(p.monto)}</Td>
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
