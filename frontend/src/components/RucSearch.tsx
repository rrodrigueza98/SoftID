import { useState } from 'react';
import { api, apiErrorMessage } from '../lib/api-client';
import { Button } from './ui/Button';
import { Input, FormField } from './ui/Field';

export interface ResultadoBusquedaRuc {
  ruc: string;
  dv: string;
  razonSocial: string;
  activo: boolean;
  estado: string;
}

// Buscador reusable contra el proxy /terceros/buscar-ruc (ruc.sun.com.py,
// datos publicos de la DNIT indexados por terceros -- no es el webservice
// oficial que exige apiKey de Marangatu). Se usa tanto en el alta manual de
// Clientes/Proveedores como, embebido en un Dialog, al elegir el cliente de
// un comprobante.
export function RucSearchBox({ onSelect }: { onSelect: (r: ResultadoBusquedaRuc) => void }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusquedaRuc[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = async () => {
    if (!query.trim()) return;
    setBuscando(true);
    setError(null);
    setResultados(null);
    try {
      const res = await api.get<ResultadoBusquedaRuc[]>('/terceros/buscar-ruc', { params: { q: query.trim() } });
      setResultados(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="rounded-md border border-ink-200 bg-ink-50 p-3">
      <div className="flex items-end gap-2">
        <FormField label="Buscar en DNIT (RUC o razón social)" htmlFor="dni-search">
          <Input
            id="dni-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder="Ej. 80012345 o Distribuidora Central"
            autoFocus
          />
        </FormField>
        <Button type="button" variant="secondary" onClick={buscar} disabled={buscando || !query.trim()}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {resultados && resultados.length === 0 && <p className="mt-2 text-xs text-ink-500">Sin resultados.</p>}
      {resultados && resultados.length > 0 && (
        <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
          {resultados.map((r) => (
            <button
              key={r.ruc}
              type="button"
              onClick={() => onSelect(r)}
              className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-1.5 text-left text-sm hover:border-brand-300 hover:bg-brand-50"
            >
              <span>
                <span className="font-mono text-ink-500">
                  {r.ruc}-{r.dv}
                </span>{' '}
                <span className="text-ink-900">{r.razonSocial}</span>
              </span>
              <span className={r.activo ? 'text-xs text-emerald-600' : 'text-xs text-ink-400'}>{r.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
