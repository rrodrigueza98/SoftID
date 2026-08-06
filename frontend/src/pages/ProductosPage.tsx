import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useDebouncedValue, useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { ProductoFormDialog } from './ProductoFormDialog';
import type { Producto } from '../lib/types';

const AFECTACION_LABEL: Record<Producto['afectacionIva'], string> = {
  GRAVADO: 'Gravado',
  GRAVADO_PARCIAL: 'Grav. parcial',
  EXENTO: 'Exento',
  EXONERADO: 'Exonerado',
};

export default function ProductosPage() {
  const empresaId = useEmpresaId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Productos</h1>
        <Button onClick={openNew}>Nuevo producto</Button>
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
    </div>
  );
}
