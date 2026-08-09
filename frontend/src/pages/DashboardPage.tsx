import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { useAuth } from '../lib/auth-context';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { ChartTooltip } from '../components/ui/ChartTooltip';
import type { Modulo, PanelVentas, Producto, Stock, Tercero } from '../lib/types';

const SECTIONS: { to: string; label: string; hint: string; modulo: Modulo }[] = [
  { to: '/pos', label: 'Punto de venta', hint: 'Venta rápida de mostrador', modulo: 'VENTAS' },
  { to: '/facturacion/emitir', label: 'Facturación', hint: 'Cargar y emitir un nuevo documento', modulo: 'VENTAS' },
  { to: '/facturacion', label: 'Comprobantes emitidos', hint: 'Consultar historial de facturación', modulo: 'VENTAS' },
  { to: '/clientes', label: 'Clientes', hint: 'Base de datos de clientes', modulo: 'VENTAS' },
  { to: '/proveedores', label: 'Proveedores', hint: 'Base de datos de proveedores', modulo: 'COMPRAS' },
  { to: '/compras', label: 'Compras', hint: 'Registrar comprobantes de compra', modulo: 'COMPRAS' },
  { to: '/productos', label: 'Productos', hint: 'Catálogo y precios', modulo: 'INVENTARIO' },
  { to: '/stock', label: 'Stock', hint: 'Saldos y movimientos', modulo: 'INVENTARIO' },
  { to: '/cuentas-corrientes', label: 'Cuentas corrientes', hint: 'Saldos y cobros', modulo: 'VENTAS' },
  { to: '/contabilidad', label: 'Contabilidad', hint: 'Plan de Cuentas, Libro Diario y Mayor', modulo: 'CONTABILIDAD' },
];

const BARRA = '#0078d4'; // brand-600
const CURSOR = 'rgba(0,120,212,0.06)';
const GRILLA = '#e4e9e8'; // ink-100

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function useCount<T>(key: string, url: string, params: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: [key, params],
    queryFn: async () => (await api.get<T[]>(url, { params })).data.length,
    enabled,
  });
}

export default function DashboardPage() {
  const { usuario, esAdmin } = useAuth();
  const empresaId = useEmpresaId();

  const modulosPermitidos = usuario?.modulosPermitidos ?? [];
  const restringido = !esAdmin && modulosPermitidos.length > 0;
  const puedeVer = (m: Modulo) => !restringido || modulosPermitidos.includes(m);

  const seccionesVisibles = SECTIONS.filter((s) => puedeVer(s.modulo));

  const clientes = useCount<Tercero>(
    'terceros',
    '/terceros',
    { empresaId, tipo: 'CLIENTE' },
    puedeVer('VENTAS') || puedeVer('COMPRAS'),
  );
  const productos = useCount<Producto>('productos', '/productos', { empresaId }, puedeVer('INVENTARIO'));
  const stockBajo = useQuery({
    queryKey: ['stock-bajo', empresaId],
    queryFn: async () => (await api.get<Stock[]>('/stock', { params: { empresaId } })).data,
    enabled: puedeVer('INVENTARIO'),
  });
  const desde = hace30Dias();
  const hasta = hoy();
  const panelVentas = useQuery({
    queryKey: ['panel-ventas', { empresaId, desde, hasta }],
    queryFn: async () =>
      (await api.get<PanelVentas>('/comprobantes/panel-ventas', { params: { empresaId, desde, hasta } })).data,
    enabled: puedeVer('VENTAS'),
  });

  const itemsBajoMinimo = (stockBajo.data ?? []).filter(
    (s) => s.producto.stockMinimo != null && Number(s.cantidad) <= Number(s.producto.stockMinimo),
  );
  const porFecha = (panelVentas.data?.porFecha ?? []).map((f) => ({ ...f, etiqueta: formatDate(f.fecha) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Hola, {usuario?.nombre.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">Resumen rápido de tu empresa.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {puedeVer('VENTAS') && (
          <>
            <StatTile label="Ventas (30 días)" value={panelVentas.data?.totalVentas ?? '—'} />
            <StatTile label="Facturado (30 días)" value={panelVentas.data ? formatGs(panelVentas.data.montoTotal) : '—'} />
          </>
        )}
        {(puedeVer('VENTAS') || puedeVer('COMPRAS')) && <StatTile label="Clientes" value={clientes.data ?? '—'} />}
        {puedeVer('INVENTARIO') && (
          <>
            <StatTile label="Productos" value={productos.data ?? '—'} />
            <StatTile
              label="Bajo stock mínimo"
              value={itemsBajoMinimo.length}
              tone={itemsBajoMinimo.length > 0 ? 'warning' : 'neutral'}
            />
          </>
        )}
      </div>

      {puedeVer('VENTAS') && porFecha.length > 0 && (
        <Card>
          <CardHeader title="Ventas por fecha" subtitle="Monto facturado — últimos 30 días" />
          <div className="h-56 px-2 py-4">
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
                        lineas: [`Monto: ${formatGs(row.monto as number)}`, `Comprobantes: ${row.cantidad as number}`],
                      })}
                    />
                  }
                />
                <Bar dataKey="monto" fill={BARRA} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Ir a…</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {seccionesVisibles.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <p className="font-medium text-ink-900">{s.label}</p>
              <p className="mt-0.5 text-sm text-ink-500">{s.hint}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
