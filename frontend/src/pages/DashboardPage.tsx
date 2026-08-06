import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { useAuth } from '../lib/auth-context';
import { Card } from '../components/ui/Card';
import type { Producto, Stock, Tercero } from '../lib/types';

const SECTIONS = [
  { to: '/facturacion/emitir', label: 'Facturación', hint: 'Cargar y emitir un nuevo documento' },
  { to: '/facturacion', label: 'Comprobantes emitidos', hint: 'Consultar historial de facturación' },
  { to: '/clientes', label: 'Clientes', hint: 'Base de datos de clientes' },
  { to: '/productos', label: 'Productos', hint: 'Catálogo y precios' },
  { to: '/stock', label: 'Stock', hint: 'Saldos y movimientos' },
  { to: '/cuentas-corrientes', label: 'Cuentas corrientes', hint: 'Saldos y cobros' },
];

function useCount<T>(key: string, url: string, params: Record<string, string>) {
  return useQuery({
    queryKey: [key, params],
    queryFn: async () => (await api.get<T[]>(url, { params })).data.length,
  });
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const empresaId = useEmpresaId();

  const clientes = useCount<Tercero>('terceros', '/terceros', { empresaId, tipo: 'CLIENTE' });
  const productos = useCount<Producto>('productos', '/productos', { empresaId });
  const stockBajo = useQuery({
    queryKey: ['stock-bajo', empresaId],
    queryFn: async () => (await api.get<Stock[]>('/stock', { params: { empresaId } })).data,
  });

  const itemsBajoMinimo = (stockBajo.data ?? []).filter(
    (s) => s.producto.stockMinimo != null && Number(s.cantidad) <= Number(s.producto.stockMinimo),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Hola, {usuario?.nombre.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">Resumen rápido de tu empresa.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Clientes</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{clientes.data ?? '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Productos</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{productos.data ?? '—'}</p>
        </Card>
        <Card className={itemsBajoMinimo.length > 0 ? 'border-amber-300 bg-amber-50 p-5' : 'p-5'}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Bajo stock mínimo</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{itemsBajoMinimo.length}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-700">Ir a…</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
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
