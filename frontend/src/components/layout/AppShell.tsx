import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { cn } from '../../lib/cn';

type NavItem = { to: string; label: string; end?: boolean; soloAdmin?: boolean };

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', end: true }] },
  {
    title: 'Ventas',
    items: [
      { to: '/pos', label: 'Punto de venta' },
      { to: '/facturacion/emitir', label: 'Facturación' },
      { to: '/facturacion', label: 'Comprobantes emitidos', end: true },
      { to: '/clientes', label: 'Clientes' },
      { to: '/cuentas-corrientes', label: 'Cuentas corrientes' },
    ],
  },
  {
    title: 'Compras',
    items: [
      { to: '/proveedores', label: 'Proveedores' },
      { to: '/compras', label: 'Comprobantes de compra' },
    ],
  },
  {
    title: 'Inventario',
    items: [
      { to: '/productos', label: 'Productos' },
      { to: '/stock', label: 'Stock' },
    ],
  },
  { title: 'Contabilidad', items: [{ to: '/contabilidad', label: 'Contabilidad' }] },
  { title: 'Configuración', items: [{ to: '/usuarios', label: 'Usuarios', soloAdmin: true }] },
];

// Secciones abiertas por default -- asi el menu no arranca todo colapsado
// la primera vez que alguien entra.
const SECCIONES_ABIERTAS_POR_DEFECTO = new Set(NAV_SECTIONS.filter((s) => s.title).map((s) => s.title!));

export function AppShell() {
  const { usuario, esAdmin, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [abiertas, setAbiertas] = useState(SECCIONES_ABIERTAS_POR_DEFECTO);
  const location = useLocation();

  // Los items marcados soloAdmin no existen para un Operador -- se filtran
  // aca en vez de ocultarlos con CSS, para que ni siquiera aparezcan un
  // instante en el DOM. Las secciones que quedan sin items no se muestran.
  const seccionesVisibles = useMemo(
    () =>
      NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => !i.soloAdmin || esAdmin) })).filter(
        (s) => s.items.length > 0,
      ),
    [esAdmin],
  );

  // Al navegar (click en un link del menu) cerramos el drawer mobile --
  // si no, queda tapando la pantalla despues de elegir una seccion.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Si la navegacion (ej. un link del Dashboard) lleva a una pantalla cuya
  // seccion esta colapsada, la reabrimos -- si no, el item activo queda
  // resaltado pero invisible dentro de un acordeon cerrado.
  useEffect(() => {
    const seccion = NAV_SECTIONS.find((s) => s.items.some((item) => item.to === location.pathname));
    if (seccion?.title && !abiertas.has(seccion.title)) {
      setAbiertas((prev) => new Set(prev).add(seccion.title!));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleSeccion = (title: string) => {
    setAbiertas((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Barra superior solo en mobile: el sidebar completo no entra en pantallas chicas. */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-ink-900 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 font-mono text-sm font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold text-white">SoftID</span>
        </div>
        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-200 hover:bg-ink-800 hover:text-white"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
      </div>

      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 md:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-ink-200 bg-ink-900 text-ink-100 transition-transform duration-200 md:static md:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden items-center gap-2.5 px-5 py-5 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 font-mono text-sm font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold text-white">SoftID</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-16 md:pt-3">
          {seccionesVisibles.map((section, i) => {
            if (!section.title) {
              return (
                <div key={i} className="space-y-0.5 pb-3">
                  {section.items.map((item) => (
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
                </div>
              );
            }

            const abierta = abiertas.has(section.title);
            return (
              <div key={section.title} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSeccion(section.title!)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500 hover:text-ink-300"
                  aria-expanded={abierta}
                >
                  {section.title}
                  <span className={cn('transition-transform', abierta ? 'rotate-90' : '')}>›</span>
                </button>
                {abierta && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
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
                  </div>
                )}
              </div>
            );
          })}
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

      <main className="w-full flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
