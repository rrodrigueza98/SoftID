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
import { ProductoFormDialog } from './ProductoFormDialog';
import type { Producto } from '../lib/types';

interface FilaConError {
  fila: number;
  mensaje: string;
}

const AFECTACION_LABEL: Record<Producto['afectacionIva'], string> = {
  GRAVADO: 'Gravado',
  GRAVADO_PARCIAL: 'Grav. parcial',
  EXENTO: 'Exento',
  EXONERADO: 'Exonerado',
};

export default function ProductosPage() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState<{ creados: number } | null>(null);
  const [importErrores, setImportErrores] = useState<FilaConError[] | null>(null);
  const [importErrorGeneral, setImportErrorGeneral] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['productos', { empresaId, search: debouncedSearch }],
    queryFn: async () =>
      (await api.get<Producto[]>('/productos', { params: { empresaId, search: debouncedSearch || undefined } })).data,
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: Producto) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function handleDescargarPlantilla() {
    setDescargandoPlantilla(true);
    try {
      const res = await api.get('/productos/plantilla-excel', { params: { empresaId }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-productos.xlsx';
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
      const res = await api.post<{ creados: number }>('/productos/importar-excel', formData, {
        params: { empresaId },
      });
      setImportResultado(res.data);
      queryClient.invalidateQueries({ queryKey: ['productos', { empresaId }] });
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Productos</h1>
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
          <Button onClick={openNew}>Nuevo producto</Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Búsqueda"
          actions={
            <Input
              placeholder="Código o descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          }
        />
        {isLoading ? (
          <PageSpinner />
        ) : !data || data.length === 0 ? (
          <EmptyState message={search ? 'No se encontraron resultados.' : 'Todavía no cargaste ningún producto.'} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Código</Th>
                <Th>Descripción</Th>
                <Th>IVA</Th>
                <Th className="text-right">Costo</Th>
                <Th className="text-right">Venta</Th>
                <Th>Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((p) => (
                <Tr key={p.id} onClick={() => openEdit(p)}>
                  <Td className="font-mono text-xs">{p.codigo}</Td>
                  <Td className="font-medium text-ink-900">
                    {p.descripcion}
                    {p.categoria && <span className="ml-1.5 text-ink-400">· {p.categoria.nombre}</span>}
                  </Td>
                  <Td>
                    {AFECTACION_LABEL[p.afectacionIva]}
                    {(p.afectacionIva === 'GRAVADO' || p.afectacionIva === 'GRAVADO_PARCIAL') && ` ${p.tasaIva}%`}
                  </Td>
                  <Td className="text-right tabular-nums">{formatGs(p.precioCosto)}</Td>
                  <Td className="text-right tabular-nums">{formatGs(p.precioVenta)}</Td>
                  <Td>
                    <Badge tone={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ProductoFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} producto={editing} />

      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportResultado(null);
          setImportErrores(null);
          setImportErrorGeneral(null);
        }}
        title="Importar productos desde Excel"
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
              {importResultado.creados === 1 ? 'producto' : 'productos'} correctamente.
            </p>
          </div>
        ) : importErrores ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-700">
              {importErrorGeneral ?? 'Hay errores en el archivo.'} No se importó ningún producto todavía.
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
