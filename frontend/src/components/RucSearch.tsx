import { useState } from 'react';
import { api, apiErrorMessage } from '../lib/api-client';
import { Button } from './ui/Button';
import { Input, FormField } from './ui/Field';
import type { TipoContribuyente } from '../lib/types';

export interface ResultadoBusquedaRuc {
  ruc: string;
  dv: string;
  razonSocial: string;
  activo: boolean;
  estado: string;
  tipoContribuyente: TipoContribuyente;
}

// Buscador reusable contra el proxy /terceros/buscar-ruc (ruc.sun.com.py,
// datos publicos de la DNIT indexados por terceros -- no es el webservice
// oficial que exige apiKey de Marangatu). Se usa tanto en el alta manual de
// Clientes/Proveedores como, embebido en un Dialog, al elegir el cliente de
// un comprobante.
//
// SIFEN exige el tipo de contribuyente (iTiContRec) para todo receptor con
// RUC -- rechazo real: "Es obligatorio informar el tipo de contribuyente
// receptor". ruc.sun.com.py no lo devuelve, asi que se lo pide aca mismo
// (un paso intermedio despues de elegir el resultado) para que ningun
// consumidor de este componente pueda crear un Tercero con RUC sin ese
// dato -- antes cada pantalla lo omitia "para no cortar el flujo", lo que
// dejaba clientes/proveedores invalidos para facturarles.
export function RucSearchBox({ onSelect }: { onSelect: (r: ResultadoBusquedaRuc) => void }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Omit<ResultadoBusquedaRuc, 'tipoContribuyente'>[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<Omit<ResultadoBusquedaRuc, 'tipoContribuyente'> | null>(null);

  const buscar = async () => {
    if (!query.trim()) return;
    setBuscando(true);
    setError(null);
    setResultados(null);
    try {
      const res = await api.get<Omit<ResultadoBusquedaRuc, 'tipoContribuyente'>[]>('/terceros/buscar-ruc', {
        params: { q: query.trim() },
      });
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

      {!seleccionado && resultados && resultados.length === 0 && (
        <p className="mt-2 text-xs text-ink-500">Sin resultados.</p>
      )}
      {!seleccionado && resultados && resultados.length > 0 && (
        <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
          {resultados.map((r) => (
            <button
              key={r.ruc}
              type="button"
              onClick={() => setSeleccionado(r)}
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

      {seleccionado && (
        <div className="mt-2 rounded-md border border-ink-200 bg-white p-3">
          <p className="text-sm text-ink-800">
            <span className="font-mono text-ink-500">
              {seleccionado.ruc}-{seleccionado.dv}
            </span>{' '}
            {seleccionado.razonSocial}
          </p>
          <p className="mt-1 text-xs text-ink-500">¿Es persona física o jurídica ante la SET?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onSelect({ ...seleccionado, tipoContribuyente: 'FISICA' })}>
              Persona física
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSelect({ ...seleccionado, tipoContribuyente: 'JURIDICA' })}
            >
              Persona jurídica
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSeleccionado(null)}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
