import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api, apiErrorMessage } from '../lib/api-client';
import { useDebouncedValue, useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { TerceroFormDialog } from './TerceroFormDialog';
import type { Tercero, TipoTercero } from '../lib/types';

interface FilaConError {
  fila: number;
  mensaje: string;
}

const TITULOS: Record<TipoTercero, { titulo: string; nuevo: string; vacio: string }> = {
  CLIENTE: { titulo: 'Clientes', nuevo: 'Nuevo cliente', vacio: 'Todavía no cargaste ningún cliente.' },
  PROVEEDOR: { titulo: 'Proveedores', nuevo: 'Nuevo proveedor', vacio: 'Todavía no cargaste ningún proveedor.' },
  AMBOS: { titulo: 'Terceros', nuevo: 'Nuevo tercero', vacio: 'Todavía no cargaste ningún tercero.' },
};

export default function TercerosPage({ tipo }: { tipo: TipoTercero }) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tercero | null>(null);
  const copy = TITULOS[tipo];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ creados: number } | null>(null);
  const [importErrores, setImportErrores] = useState<FilaConError[] | null>(null);
  const [importErrorGeneral, setImportErrorGeneral] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['terceros', { empresaId, tipo, search: debouncedSearch }],
    queryFn: async () =>
      (
        await api.get<Tercero[]>('/terceros', {
          params: { empresaId, tipo, search: debouncedSearch || undefined },
        })
      ).data,
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(t: Tercero) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleDescargarPlantilla() {
    setDescargandoPlantilla(true);
    try {
      const res = await api.get('/terceros/plantilla-excel', { params: { empresaId, tipo }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla-${tipo === 'CLIENTE' ? 'clientes' : 'proveedores'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDescargandoPlantilla(false);
    }
  }

  async function handleArchivoSeleccionado(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportando(true);
    setImportResultado(null);
    setImportErrores(null);
    setImportErrorGeneral(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ creados: number }>('/terceros/importar-excel', formData, {
        params: { empresaId, tipo },
      });
      setImportResultado(res.data);
      queryClient.invalidateQueries({ queryKey: ['terceros', { empresaId }] });
    } catch (err) {
      const data = axios.isAxiosError(err) ? (err.response?.data as { message?: string; errores?: FilaConError[] }) : undefined;
      if (data?.errores?.length) {
        setImportErrores(data.errores);
        setImportErrorGeneral(data.message ?? null);
      } else {
        setImportErrorGeneral(apiErrorMessage(err));
      }
    } finally {
      setImportando(false);
    }
  }

  const importDialogOpen = importando || Boolean(importResultado) || Boolean(importErrores) || Boolean(importErrorGeneral);
  const sustantivo = tipo === 'CLIENTE' ? 'cliente' : 'proveedor';
  const sustantivoPlural = tipo === 'CLIENTE' ? 'clientes' : 'proveedores';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{copy.titulo}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDescargarPlantilla} disabled={descargandoPlantilla}>
            {descargandoPlantilla ? 'Generando…' : 'Descargar plantilla'}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importando}>
            {importando ? 'Importando…' : 'Importar Excel'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleArchivoSeleccionado}
          />
          <Button onClick={openNew}>{copy.nuevo}</Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Búsqueda"
          actions={
            <Input
              placeholder="Nombre o número de documento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          }
        />
        {isLoading ? (
          <PageSpinner />
        ) : !data || data.length === 0 ? (
          <EmptyState message={search ? 'No se encontraron resultados.' : copy.vacio} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Razón social</Th>
                <Th>Documento</Th>
                <Th>Contacto</Th>
                <Th className="text-right">Saldo cta. cte.</Th>
                <Th>Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((t) => (
                <Tr key={t.id} onClick={() => openEdit(t)}>
                  <Td className="font-medium text-ink-900">
                    {t.razonSocial}
                    {t.nombreFantasia && <span className="ml-1.5 text-ink-400">({t.nombreFantasia})</span>}
                  </Td>
                  <Td className="font-mono text-xs">{t.numeroDocumento}</Td>
                  <Td className="text-ink-500">{t.email || t.telefono || '—'}</Td>
                  <Td className="text-right tabular-nums">
                    {t.cuentaCorriente ? formatGs(t.cuentaCorriente.saldo) : '—'}
                  </Td>
                  <Td>
                    <Badge tone={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <TerceroFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} tipo={tipo} tercero={editing} />

      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportResultado(null);
          setImportErrores(null);
          setImportErrorGeneral(null);
        }}
        title={`Importar ${sustantivoPlural} desde Excel`}
        width={importErrores ? 'lg' : 'sm'}
      >
        {importando ? (
          <PageSpinner />
        ) : importResultado ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
            <p className="text-sm text-ink-700">
              Se {importResultado.creados === 1 ? 'importó' : 'importaron'}{' '}
              <span className="font-semibold text-ink-900">{importResultado.creados}</span>{' '}
              {importResultado.creados === 1 ? sustantivo : sustantivoPlural} correctamente.
            </p>
          </div>
        ) : importErrores ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-700">
              {importErrorGeneral ?? 'Hay errores en el archivo.'} No se importó ningún {sustantivo} todavía.
            </p>
            <Table>
              <Thead>
                <tr>
                  <Th>Fila</Th>
                  <Th>Error</Th>
                </tr>
              </Thead>
              <tbody>
                {importErrores.map((e) => (
                  <Tr key={e.fila}>
                    <Td className="tabular-nums">{e.fila}</Td>
                    <Td className="text-ink-700">{e.mensaje}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-red-700">{importErrorGeneral}</p>
        )}
      </Dialog>
    </div>
  );
}
