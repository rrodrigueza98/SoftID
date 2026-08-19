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
import { formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Field';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { StatTile } from '../components/ui/StatTile';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import type { ReporteRentabilidad } from '../lib/types';

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

const BARRA = '#4c6b8a'; // brand-600
const CURSOR = 'rgba(76,107,138,0.06)';
const GRILLA = '#ecedf0'; // ink-100

export default function PanelRentabilidadPage() {
  const empresaId = useEmpresaId();
  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(hoy());
  const [exportando, setExportando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-rentabilidad', { empresaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<ReporteRentabilidad>('/comprobantes/reporte-rentabilidad', { params: { empresaId, desde, hasta } }))
        .data,
  });

  const handleExportar = async () => {
    setExportando(true);
    try {
      const res = await api.get('/comprobantes/reporte-rentabilidad.xlsx', {
        params: { empresaId, desde, hasta },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentabilidad-${desde}-a-${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  const items = data?.items ?? [];
  const topMargen = [...items].sort((a, b) => b.margen - a.margen).slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Panel de rentabilidad</h1>
          <p className="mt-1 text-sm text-ink-500">Margen por producto (venta − costo) de las facturas emitidas.</p>
        </div>
        <div className="flex items-end gap-3">
          <FormField label="Desde">
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </FormField>
          <FormField label="Hasta">
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </FormField>
          <Button variant="secondary" onClick={handleExportar} disabled={exportando}>
            {exportando ? 'Generando…' : 'Descargar Excel'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data || items.length === 0 ? (
        <Card>
          <EmptyState message="No hay ventas con costo cargado en el rango seleccionado." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Venta total" value={formatGs(data.totales.totalVenta)} />
            <StatTile label="Costo total" value={formatGs(data.totales.totalCosto)} />
            <StatTile label="Margen" value={formatGs(data.totales.margen)} />
            <StatTile label="Margen %" value={`${data.totales.margenPorcentual.toFixed(1).replace('.', ',')} %`} />
          </div>

          {data.ventaSinCosto > 0 && (
            <p className="text-xs text-ink-400">
              Ítems sin costo cargado (no incluidos en el detalle por producto): {formatGs(data.ventaSinCosto)}
            </p>
          )}

          <Card>
            <CardHeader title="Top productos por margen" subtitle="Margen bruto (venta - costo)" />
            <div className="h-64 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMargen} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
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
                          lineas: [
                            `Margen: ${formatGs(row.margen as number)}`,
                            `Margen %: ${(row.margenPorcentual as number).toFixed(1).replace('.', ',')} %`,
                          ],
                        })}
                      />
                    }
                  />
                  <Bar dataKey="margen" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Detalle por producto" />
            <Table>
              <Thead>
                <tr>
                  <Th>Producto</Th>
                  <Th className="text-right">Cantidad</Th>
                  <Th className="text-right">Venta</Th>
                  <Th className="text-right">Costo</Th>
                  <Th className="text-right">Margen</Th>
                  <Th className="text-right">Margen %</Th>
                </tr>
              </Thead>
              <tbody>
                {[...items]
                  .sort((a, b) => b.margen - a.margen)
                  .map((i) => (
                    <Tr key={i.productoId}>
                      <Td className="font-medium text-ink-900">{i.descripcion}</Td>
                      <Td className="text-right tabular-nums">{i.cantidad}</Td>
                      <Td className="text-right tabular-nums">{formatGs(i.totalVenta)}</Td>
                      <Td className="text-right tabular-nums">{formatGs(i.totalCosto)}</Td>
                      <Td className="text-right tabular-nums">{formatGs(i.margen)}</Td>
                      <Td className="text-right tabular-nums">{i.margenPorcentual.toFixed(1).replace('.', ',')} %</Td>
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
