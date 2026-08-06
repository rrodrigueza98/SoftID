import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { ComprobanteDetailDialog } from './ComprobanteDetailDialog';
import { TIPO_DOCUMENTO_ABREVIADO, TIPO_DOCUMENTO_LABEL } from './comprobante-labels';
import type { Comprobante, TipoDocumentoElectronico } from '../lib/types';

export default function ComprobantesPage() {
  const empresaId = useEmpresaId();
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoElectronico | ''>('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comprobantes', { empresaId, tipoDocumento }],
    queryFn: async () =>
      (
        await api.get<Comprobante[]>('/comprobantes', {
          params: { empresaId, tipoDocumento: tipoDocumento || undefined },
        })
      ).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Comprobantes emitidos</h1>
        <Link to="/facturacion/emitir">
          <Button>Emitir comprobante</Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Historial"
          actions={
            <Select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoElectronico | '')} className="w-64">
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_DOCUMENTO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          }
        />
        {isLoading ? (
          <PageSpinner />
        ) : !data || data.length === 0 ? (
          <EmptyState message="Todavía no emitiste ningún comprobante." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Tipo</Th>
                <Th>Número</Th>
                <Th>Fecha</Th>
                <Th>Cliente / Proveedor</Th>
                <Th className="text-right">Total</Th>
                <Th>Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {data.map((c) => (
                <Tr key={c.id} onClick={() => setDetailId(c.id)}>
                  <Td>
                    <span className="font-mono text-xs text-ink-500">{TIPO_DOCUMENTO_ABREVIADO[c.tipoDocumento]}</span>
                  </Td>
                  <Td className="font-mono text-ink-900">{c.numero}</Td>
                  <Td className="text-ink-500">{formatDate(c.fechaEmision)}</Td>
                  <Td className="font-medium text-ink-900">{c.cliente?.razonSocial ?? c.proveedor?.razonSocial ?? '—'}</Td>
                  <Td className="text-right tabular-nums">{formatGs(c.total)}</Td>
                  <Td>
                    <Badge tone={c.estado === 'EMITIDO' ? 'success' : c.estado === 'ANULADO' ? 'danger' : 'neutral'}>
                      {c.estado}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ComprobanteDetailDialog open={detailId !== null} onClose={() => setDetailId(null)} comprobanteId={detailId} />
    </div>
  );
}
