import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { formatDate, formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import type { CuentaBancaria, ImportarExtractoResultado, MovimientoBancario } from '../lib/types';

export function ConciliarCuentaDialog({
  open,
  onClose,
  cuentaBancaria,
}: {
  open: boolean;
  onClose: () => void;
  cuentaBancaria: CuentaBancaria;
}) {
  const queryClient = useQueryClient();
  const [fechaCorte, setFechaCorte] = useState(() => new Date().toISOString().slice(0, 10));
  const [saldoExtracto, setSaldoExtracto] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: saldoData, isFetching: calculandoSaldo } = useQuery({
    queryKey: ['cuenta-bancaria-saldo', cuentaBancaria.id, fechaCorte],
    queryFn: async () =>
      (await api.get<{ saldo: number }>(`/cuentas-bancarias/${cuentaBancaria.id}/saldo`, { params: { hasta: fechaCorte } }))
        .data,
    enabled: open && Boolean(fechaCorte),
  });

  const { data: movimientos, isFetching: cargandoMovimientos } = useQuery({
    queryKey: ['movimientos-bancarios', cuentaBancaria.id, { hasta: fechaCorte }],
    queryFn: async () =>
      (
        await api.get<MovimientoBancario[]>('/movimientos-bancarios', {
          params: { cuentaBancariaId: cuentaBancaria.id, hasta: fechaCorte },
        })
      ).data,
    enabled: open && Boolean(fechaCorte),
  });

  // Pendientes primero -- es lo que el usuario tiene que revisar contra el
  // extracto en papel/PDF. Los ya conciliados quedan abajo, sin ocultarlos,
  // por si hay que destildar alguno por error.
  const movimientosOrdenados = useMemo(() => {
    if (!movimientos) return [];
    return [...movimientos].sort((a, b) => {
      if (a.conciliado !== b.conciliado) return a.conciliado ? 1 : -1;
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
  }, [movimientos]);

  const pendientes = movimientos?.filter((m) => !m.conciliado).length ?? 0;

  const saldoLibros = saldoData?.saldo ?? 0;
  const diferencia = saldoExtracto ? saldoLibros - Number(saldoExtracto) : null;

  const toggleConciliado = useMutation({
    mutationFn: ({ id, conciliado }: { id: string; conciliado: boolean }) =>
      api.patch(`/movimientos-bancarios/${id}/conciliar`, { conciliado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios'] }),
  });

  // Flujo de importar extracto: se sube un Excel, el backend lo coteja
  // contra los movimientos pendientes (misma fecha +/- unos dias, mismo
  // tipo y monto) y devuelve una vista previa sin tocar nada todavia. El
  // usuario destilda lo que no quiera confirmar y recien ahi se marcan
  // conciliados los movimientos elegidos.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [previewExtracto, setPreviewExtracto] = useState<ImportarExtractoResultado | null>(null);
  const [erroresExtracto, setErroresExtracto] = useState<{ fila: number; mensaje: string }[] | null>(null);
  const [erroExtractoGeneral, setErrorExtractoGeneral] = useState<string | null>(null);
  const [seleccionMatches, setSeleccionMatches] = useState<Set<string>>(new Set());
  const [descargandoPlantillaExtracto, setDescargandoPlantillaExtracto] = useState(false);

  async function handleDescargarPlantillaExtracto() {
    setDescargandoPlantillaExtracto(true);
    try {
      const res = await api.get('/movimientos-bancarios/plantilla-extracto', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-extracto-bancario.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDescargandoPlantillaExtracto(false);
    }
  }

  async function handleArchivoExtractoSeleccionado(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportando(true);
    setPreviewExtracto(null);
    setErroresExtracto(null);
    setErrorExtractoGeneral(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ImportarExtractoResultado>('/movimientos-bancarios/importar-extracto', formData, {
        params: { cuentaBancariaId: cuentaBancaria.id },
      });
      if (res.data.errores.length > 0) {
        setErroresExtracto(res.data.errores);
      } else {
        setPreviewExtracto(res.data);
        setSeleccionMatches(new Set(res.data.matches.map((m) => m.movimiento.id)));
      }
    } catch (err) {
      setErrorExtractoGeneral(apiErrorMessage(err));
    } finally {
      setImportando(false);
    }
  }

  function cerrarPreviewExtracto() {
    setPreviewExtracto(null);
    setErroresExtracto(null);
    setErrorExtractoGeneral(null);
  }

  const confirmarExtracto = useMutation({
    mutationFn: (ids: string[]) => api.post<{ conciliados: number }>('/movimientos-bancarios/confirmar-conciliacion-extracto', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios'] });
      cerrarPreviewExtracto();
    },
    onError: (err) => setErrorExtractoGeneral(apiErrorMessage(err)),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/conciliaciones-bancarias', {
        cuentaBancariaId: cuentaBancaria.id,
        fechaCorte,
        saldoExtracto: Number(saldoExtracto),
        observacion: observacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliaciones-bancarias', cuentaBancaria.id] });
      setSaldoExtracto('');
      setObservacion('');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const puedeConciliar = fechaCorte && saldoExtracto !== '';

  return (
    <Dialog open={open} onClose={onClose} title={`Conciliar — ${cuentaBancaria.nombre}`} width="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Fecha de corte" required>
            <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} required autoFocus />
          </FormField>

          <div className="rounded-md bg-ink-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Saldo según libros</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-ink-900">
              {calculandoSaldo ? '…' : formatGs(saldoLibros)}
            </p>
          </div>

          <FormField label="Saldo según extracto bancario (₲)" required>
            <Input
              type="number"
              step="0.01"
              value={saldoExtracto}
              onChange={(e) => setSaldoExtracto(e.target.value)}
              required
            />
          </FormField>
        </div>

        {diferencia !== null && (
          <div className="flex items-center justify-between rounded-md border border-ink-200 px-3 py-2.5">
            <span className="text-sm text-ink-600">Diferencia</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-medium text-ink-900">{formatGs(diferencia)}</span>
              <Badge tone={diferencia === 0 ? 'success' : 'warning'}>{diferencia === 0 ? 'Cuadra' : 'No cuadra'}</Badge>
            </div>
          </div>
        )}

        <div className="rounded-md border border-ink-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2">
            <span className="text-sm font-medium text-ink-700">Movimientos hasta esta fecha</span>
            <div className="flex items-center gap-3">
              {!previewExtracto && !erroresExtracto && (
                <span className="text-xs text-ink-500">
                  {cargandoMovimientos
                    ? 'Cargando…'
                    : pendientes === 0
                      ? 'Todos conciliados'
                      : `${pendientes} pendiente${pendientes === 1 ? '' : 's'} de ${movimientos?.length ?? 0}`}
                </span>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={handleDescargarPlantillaExtracto} disabled={descargandoPlantillaExtracto}>
                {descargandoPlantillaExtracto ? 'Generando…' : 'Descargar plantilla'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importando}>
                {importando ? 'Importando…' : 'Importar extracto'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleArchivoExtractoSeleccionado}
              />
            </div>
          </div>

          {erroExtractoGeneral && !erroresExtracto && (
            <div className="mx-3 my-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroExtractoGeneral}</div>
          )}

          {erroresExtracto ? (
            <div className="flex flex-col gap-2 px-3 py-3">
              <p className="text-sm text-ink-700">
                {erroExtractoGeneral ?? 'Hay errores en el archivo.'} No se aplicó ninguna coincidencia todavía.
              </p>
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Fila</Th>
                      <Th>Error</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {erroresExtracto.map((e) => (
                      <Tr key={e.fila}>
                        <Td className="tabular-nums">{e.fila}</Td>
                        <Td className="text-ink-700">{e.mensaje}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="secondary" onClick={cerrarPreviewExtracto}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : previewExtracto ? (
            <div className="flex flex-col gap-3 px-3 py-3">
              <p className="text-sm text-ink-600">
                <span className="font-medium text-ink-900">{previewExtracto.matches.length}</span> coincidencia
                {previewExtracto.matches.length === 1 ? '' : 's'} encontrada{previewExtracto.matches.length === 1 ? '' : 's'}
                {previewExtracto.sinCoincidencia.length > 0 && (
                  <>
                    {' '}
                    · <span className="font-medium text-ink-900">{previewExtracto.sinCoincidencia.length}</span> línea
                    {previewExtracto.sinCoincidencia.length === 1 ? '' : 's'} del extracto sin movimiento correspondiente
                  </>
                )}
              </p>

              {previewExtracto.matches.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-ink-100">
                  <Table>
                    <Thead>
                      <tr>
                        <Th className="text-center">
                          <input
                            type="checkbox"
                            checked={seleccionMatches.size === previewExtracto.matches.length}
                            onChange={(e) =>
                              setSeleccionMatches(
                                e.target.checked ? new Set(previewExtracto.matches.map((m) => m.movimiento.id)) : new Set(),
                              )
                            }
                            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          />
                        </Th>
                        <Th>Movimiento (libro)</Th>
                        <Th>Línea (extracto)</Th>
                        <Th className="text-right">Monto</Th>
                      </tr>
                    </Thead>
                    <tbody>
                      {previewExtracto.matches.map((m) => (
                        <Tr key={m.movimiento.id}>
                          <Td className="text-center">
                            <input
                              type="checkbox"
                              checked={seleccionMatches.has(m.movimiento.id)}
                              onChange={(e) => {
                                const next = new Set(seleccionMatches);
                                if (e.target.checked) next.add(m.movimiento.id);
                                else next.delete(m.movimiento.id);
                                setSeleccionMatches(next);
                              }}
                              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                            />
                          </Td>
                          <Td className="text-ink-800">
                            {formatDate(m.movimiento.fecha)} · {m.movimiento.concepto}
                          </Td>
                          <Td className="text-ink-500">
                            {formatDate(m.linea.fecha)} · {m.linea.concepto}
                            {m.diferenciaDias !== 0 && (
                              <span className="ml-1 text-ink-400">
                                ({m.diferenciaDias > 0 ? '+' : ''}
                                {m.diferenciaDias}d)
                              </span>
                            )}
                          </Td>
                          <Td className="text-right tabular-nums">
                            {m.linea.tipo === 'DEBITO' ? '-' : ''}
                            {formatGs(m.linea.monto)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {previewExtracto.sinCoincidencia.length > 0 && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-medium">Sin movimiento correspondiente en el libro:</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {previewExtracto.sinCoincidencia.map((l, i) => (
                      <li key={i}>
                        {formatDate(l.fecha)} · {l.concepto} · {l.tipo === 'DEBITO' ? '-' : ''}
                        {formatGs(l.monto)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={cerrarPreviewExtracto}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={seleccionMatches.size === 0 || confirmarExtracto.isPending}
                  onClick={() => confirmarExtracto.mutate(Array.from(seleccionMatches))}
                >
                  {confirmarExtracto.isPending
                    ? 'Confirmando…'
                    : `Confirmar ${seleccionMatches.size} coincidencia${seleccionMatches.size === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {cargandoMovimientos ? (
                <div className="px-3 py-6 text-center text-sm text-ink-400">Cargando movimientos…</div>
              ) : movimientosOrdenados.length === 0 ? (
                <EmptyState message="Sin movimientos hasta esta fecha." />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Concepto</Th>
                      <Th className="text-right">Monto</Th>
                      <Th className="text-center">Conciliado</Th>
                    </tr>
                  </Thead>
                  <tbody>
                    {movimientosOrdenados.map((m) => (
                      <Tr key={m.id}>
                        <Td className="text-ink-500">{formatDate(m.fecha)}</Td>
                        <Td className={m.conciliado ? 'text-ink-400' : 'text-ink-800'}>{m.concepto}</Td>
                        <Td className="text-right tabular-nums">
                          {m.tipo === 'DEBITO' ? '-' : ''}
                          {formatGs(m.monto)}
                        </Td>
                        <Td className="text-center">
                          <input
                            type="checkbox"
                            checked={m.conciliado}
                            onChange={(e) => toggleConciliado.mutate({ id: m.id, conciliado: e.target.checked })}
                            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </div>

        <FormField label="Observación (opcional)">
          <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </FormField>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeConciliar || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar conciliación'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
