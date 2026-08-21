import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { formatDateTime, formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import type { Comprobante } from '../lib/types';
import { tipoDocumentoLabel } from './comprobante-labels';
import { useState } from 'react';

export function ComprobanteDetailDialog({
  open,
  onClose,
  comprobanteId,
}: {
  open: boolean;
  onClose: () => void;
  comprobanteId: string | null;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const { data: comprobante, isLoading } = useQuery({
    queryKey: ['comprobante', comprobanteId],
    queryFn: async () => (await api.get<Comprobante>(`/comprobantes/${comprobanteId}`)).data,
    enabled: open && Boolean(comprobanteId),
  });

  const anular = useMutation({
    mutationFn: () => api.patch(`/comprobantes/${comprobanteId}/anular`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comprobantes'] });
      queryClient.invalidateQueries({ queryKey: ['comprobante', comprobanteId] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const handleDescargarXml = async () => {
    if (!comprobante) return;
    setDescargando(true);
    setError(null);
    try {
      const res = await api.get(`/comprobantes/${comprobante.id}/xml`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${comprobante.documentoElectronico?.cdc ?? comprobante.numero}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDescargando(false);
    }
  };

  const deAprobado =
    comprobante?.documentoElectronico?.estado === 'APROBADO' || comprobante?.documentoElectronico?.estado === 'APROBADO_CON_OBSERVACION';

  return (
    <Dialog open={open} onClose={onClose} title="Comprobante" width="lg">
      {isLoading || !comprobante ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-5">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {tipoDocumentoLabel(comprobante.tipoDocumento, comprobante.timbrado?.esElectronico ?? true)}
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-ink-900">Nº {comprobante.numero}</p>
              <p className="text-sm text-ink-500">{formatDateTime(comprobante.fechaEmision)}</p>
            </div>
            <Badge
              tone={comprobante.estado === 'EMITIDO' ? 'success' : comprobante.estado === 'ANULADO' ? 'danger' : 'neutral'}
            >
              {comprobante.estado}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {comprobante.proveedorId ? 'Proveedor' : 'Cliente'}
              </p>
              <p className="text-ink-800">{comprobante.cliente?.razonSocial ?? comprobante.proveedor?.razonSocial ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Condición</p>
              <p className="text-ink-800">{comprobante.condicionVenta === 'CREDITO' ? 'Crédito' : 'Contado'}</p>
            </div>
          </div>

          <Table>
            <Thead>
              <tr>
                <Th>Descripción</Th>
                <Th className="text-right">Cant.</Th>
                <Th className="text-right">Precio</Th>
                <Th>IVA</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </Thead>
            <tbody>
              {comprobante.items.map((item) => (
                <Tr key={item.id}>
                  <Td className="text-ink-800">{item.descripcion}</Td>
                  <Td className="text-right tabular-nums">{item.cantidad}</Td>
                  <Td className="text-right tabular-nums">{formatGs(item.precioUnitario)}</Td>
                  <Td>{item.afectacionIva === 'GRAVADO' ? `${item.tasaIva}%` : item.afectacionIva}</Td>
                  <Td className="text-right tabular-nums font-medium">{formatGs(item.total)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <div className="flex flex-col items-end gap-1 border-t border-ink-100 pt-3 text-sm">
            {Number(comprobante.subtotalExenta) > 0 && (
              <p className="text-ink-500">Exento: {formatGs(comprobante.subtotalExenta)}</p>
            )}
            {Number(comprobante.subtotalGravada10) > 0 && (
              <p className="text-ink-500">
                Gravado 10%: {formatGs(comprobante.subtotalGravada10)} (IVA {formatGs(comprobante.iva10)})
              </p>
            )}
            {Number(comprobante.subtotalGravada5) > 0 && (
              <p className="text-ink-500">
                Gravado 5%: {formatGs(comprobante.subtotalGravada5)} (IVA {formatGs(comprobante.iva5)})
              </p>
            )}
            <p className="text-base font-semibold text-ink-900">Total: {formatGs(comprobante.total)}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/imprimir/comprobantes/${comprobante.id}`, '_blank')}
            >
              {comprobante.timbrado?.esElectronico ? 'Ver KuDE' : 'Imprimir'}
            </Button>
            {deAprobado && (
              <Button variant="secondary" onClick={handleDescargarXml} disabled={descargando}>
                {descargando ? 'Descargando…' : 'Descargar XML'}
              </Button>
            )}
            {comprobante.estado === 'EMITIDO' && (
              <Button variant="danger" onClick={() => anular.mutate()} disabled={anular.isPending}>
                {anular.isPending ? 'Anulando…' : 'Anular'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
