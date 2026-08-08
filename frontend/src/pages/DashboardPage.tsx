import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { useAuth } from '../lib/auth-context';
import { Card } from '../components/ui/Card';
import type { Modulo, Producto, Stock, Tercero } from '../lib/types';

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
        {(puedeVer('VENTAS') || puedeVer('COMPRAS')) && (
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Clientes</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{clientes.data ?? '—'}</p>
          </Card>
        )}
        {puedeVer('INVENTARIO') && (
          <>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Productos</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{productos.data ?? '—'}</p>
            </Card>
            <Card className={itemsBajoMinimo.length > 0 ? 'border-amber-300 bg-amber-50 p-5' : 'p-5'}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Bajo stock mínimo</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{itemsBajoMinimo.length}</p>
            </Card>
          </>
        )}
      </div>

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
