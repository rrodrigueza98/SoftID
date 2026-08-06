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
import { TerceroFormDialog } from './TerceroFormDialog';
import type { Tercero, TipoTercero } from '../lib/types';

const TITULOS: Record<TipoTercero, { titulo: string; nuevo: string; vacio: string }> = {
  CLIENTE: { titulo: 'Clientes', nuevo: 'Nuevo cliente', vacio: 'Todavía no cargaste ningún cliente.' },
  PROVEEDOR: { titulo: 'Proveedores', nuevo: 'Nuevo proveedor', vacio: 'Todavía no cargaste ningún proveedor.' },
  AMBOS: { titulo: 'Terceros', nuevo: 'Nuevo tercero', vacio: 'Todavía no cargaste ningún tercero.' },
};

export default function TercerosPage({ tipo }: { tipo: TipoTercero }) {
  const empresaId = useEmpresaId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tercero | null>(null);
  const copy = TITULOS[tipo];

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{copy.titulo}</h1>
        <Button onClick={openNew}>{copy.nuevo}</Button>
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
    </div>
  );
}
