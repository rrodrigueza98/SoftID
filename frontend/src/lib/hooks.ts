import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { useEmpresaActiva } from './empresa-activa-context';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Las paginas que la usan siempre estan detras de ProtectedShell, asi que
// usuario nunca es null en este punto. Para un superadmin devuelve la
// "empresa activa" elegida en el selector (default: la propia) en vez de
// usuario.empresaId a secas -- asi puede operar dentro de cualquier
// empresa cliente sin loguearse como ella.
export function useEmpresaId(): string {
  const { usuario } = useAuth();
  const { empresaActivaId } = useEmpresaActiva();
  return empresaActivaId || usuario!.empresaId;
}
