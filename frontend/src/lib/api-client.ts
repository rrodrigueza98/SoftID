import axios from 'axios';

const TOKEN_KEY = 'rjra_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// En desarrollo, Vite proxea /api al backend local (ver vite.config.ts).
// En producción, frontend y backend viven en dominios distintos (Vercel /
// Railway), asi que VITE_API_URL apunta directo a la URL del backend.
const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Un 401 en cualquier momento (token vencido, usuario desactivado) manda
// derecho al login -- no tiene sentido dejar la app en un estado a medias.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      tokenStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (data?.message) return data.message;
  }
  return 'Ocurrió un error inesperado';
}
