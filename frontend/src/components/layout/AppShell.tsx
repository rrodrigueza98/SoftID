import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { cn } from '../../lib/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/facturacion/emitir', label: 'Facturación' },
  { to: '/facturacion', label: 'Comprobantes emitidos', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/productos', label: 'Productos' },
  { to: '/stock', label: 'Stock' },
  { to: '/cuentas-corrientes', label: 'Cuentas corrientes' },
];

export function AppShell() {
  const { usuario, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200 bg-ink-900 text-ink-100">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 font-mono text-sm font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold text-white">SoftID</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-700 text-white' : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-800 px-4 py-4">
          <p className="truncate text-sm font-medium text-white">{usuario?.nombre}</p>
          <p className="truncate text-xs text-ink-400">{usuario?.rol.nombre}</p>
          <button
            onClick={logout}
            className="mt-2 text-xs font-medium text-ink-400 underline decoration-dotted hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
