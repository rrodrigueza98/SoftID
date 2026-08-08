import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStorage } from './api-client';
import type { Usuario } from './types';

interface AuthContextValue {
  usuario: Usuario | null;
  esAdmin: boolean;
  esSuperAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<Usuario>('/usuarios/me')
      .then((res) => setUsuario(res.data))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    tokenStorage.set(res.data.accessToken);
    const me = await api.get<Usuario>('/usuarios/me');
    setUsuario(me.data);
  }

  function logout() {
    tokenStorage.clear();
    setUsuario(null);
  }

  const esSuperAdmin = usuario?.esSuperAdmin ?? false;

  return (
    <AuthContext.Provider
      value={{ usuario, esAdmin: usuario?.rol.tipo === 'ADMIN' || esSuperAdmin, esSuperAdmin, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
