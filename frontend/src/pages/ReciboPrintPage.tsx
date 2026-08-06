import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { PageSpinner } from '../components/ui/Spinner';
import { ReciboVisual, type ReciboVisualData } from './ReciboVisual';
import { TIPO_DOCUMENTO_ABREVIADO } from './comprobante-labels';
import type { Recibo } from '../lib/types';

function toVisualData(recibo: Recibo): ReciboVisualData {
  return {
    empresa: recibo.empresa ?? null,
    numero: recibo.numero,
    fecha: recibo.fecha,
    terceroNombre: recibo.tercero?.razonSocial ?? '—',
    terceroDocumento: recibo.tercero?.numeroDocumento,
    monto: recibo.monto,
    formaPago: recibo.formaPago,
    observacion: recibo.observacion,
    aplicaciones: (recibo.aplicaciones ?? []).map((a) => ({
      key: a.id,
      comprobanteNumero: a.comprobante?.numero ?? '',
      comprobanteTipo: a.comprobante ? TIPO_DOCUMENTO_ABREVIADO[a.comprobante.tipoDocumento] : '',
      montoAplicado: a.montoAplicado,
    })),
  };
}

export default function ReciboPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario, loading } = useAuth();

  const { data: recibo, isLoading } = useQuery({
    queryKey: ['recibo', id],
    queryFn: async () => (await api.get<Recibo>(`/recibos/${id}`)).data,
    enabled: Boolean(usuario) && Boolean(id),
  });

  useEffect(() => {
    if (recibo) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [recibo]);

  if (loading) return <PageSpinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (isLoading || !recibo) return <PageSpinner />;

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-2xl justify-end gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700"
        >
          Cerrar
        </button>
      </div>
      <ReciboVisual data={toVisualData(recibo)} />
    </div>
  );
}
