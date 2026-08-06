import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Las paginas que la usan siempre estan detras de ProtectedShell, asi que
// usuario nunca es null en este punto.
export function useEmpresaId(): string {
  const { usuario } = useAuth();
  return usuario!.empresaId;
}
