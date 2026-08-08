import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';

const STORAGE_KEY = 'rjra_empresa_activa';

interface EmpresaActivaContextValue {
  empresaActivaId: string;
  setEmpresaActivaId: (id: string) => void;
}

const EmpresaActivaContext = createContext<EmpresaActivaContextValue | null>(null);

// Solo tiene sentido para un superadmin (administra cualquier empresa) --
// para el resto de los usuarios la "empresa activa" es siempre la propia,
// sin selector visible. Se persiste en localStorage para no perderla al
// refrescar la pagina.
export function EmpresaActivaProvider({ children }: { children: ReactNode }) {
  const { usuario, esSuperAdmin } = useAuth();
  const [empresaActivaId, setEmpresaActivaIdState] = useState('');

  useEffect(() => {
    if (!usuario) {
      setEmpresaActivaIdState('');
      return;
    }
    if (!esSuperAdmin) {
      setEmpresaActivaIdState(usuario.empresaId);
      return;
    }
    const guardada = localStorage.getItem(STORAGE_KEY);
    setEmpresaActivaIdState(guardada || usuario.empresaId);
  }, [usuario, esSuperAdmin]);

  function setEmpresaActivaId(id: string) {
    setEmpresaActivaIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <EmpresaActivaContext.Provider value={{ empresaActivaId, setEmpresaActivaId }}>
      {children}
    </EmpresaActivaContext.Provider>
  );
}

export function useEmpresaActiva() {
  const ctx = useContext(EmpresaActivaContext);
  if (!ctx) throw new Error('useEmpresaActiva debe usarse dentro de EmpresaActivaProvider');
  return ctx;
}
