import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { PageSpinner } from '../components/ui/Spinner';
import { ComprobanteVisual, type ComprobanteVisualData } from './ComprobanteVisual';
import type { Comprobante } from '../lib/types';

const CONDICION_IDENTIDAD_LABEL: Record<string, string> = {
  RUC: 'RUC',
  CEDULA_PARAGUAYA: 'C.I.',
  CEDULA_EXTRANJERA: 'C.I. extranjera',
  PASAPORTE: 'Pasaporte',
  CARNET_RESIDENCIA: 'Carnet de residencia',
  TARJETA_DIPLOMATICA: 'Tarjeta diplomática',
  INNOMINADO: 'Consumidor final',
  OTRO: 'Documento',
};

function toVisualData(comprobante: Comprobante): ComprobanteVisualData {
  const receptor = comprobante.cliente ?? comprobante.proveedor;
  const est = comprobante.timbrado?.puntoExpedicion?.establecimiento;
  const pe = comprobante.timbrado?.puntoExpedicion;
  const numeroCompleto = est && pe ? `${est.codigo}-${pe.codigo}-${comprobante.numero}` : comprobante.numero;

  return {
    empresa: comprobante.empresa ?? null,
    tipoDocumento: comprobante.tipoDocumento,
    numeroCompleto,
    timbradoNumero: comprobante.timbrado?.numeroTimbrado,
    timbradoVigenciaDesde: comprobante.timbrado?.fechaInicioVigencia,
    fechaEmision: comprobante.fechaEmision,
    receptorLabel: comprobante.proveedorId ? 'Proveedor' : 'Cliente',
    receptorNombre: receptor?.razonSocial ?? 'Consumidor final',
    receptorIdentidadLabel: receptor ? CONDICION_IDENTIDAD_LABEL[receptor.tipoDocumento] : undefined,
    receptorNumeroDocumento: receptor?.numeroDocumento,
    receptorDireccion: receptor?.direccion,
    condicionVenta: comprobante.condicionVenta,
    motivoEmisionLabel: comprobante.motivoEmision?.replace(/_/g, ' ').toLowerCase(),
    items: comprobante.items.map((item) => ({
      key: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidadMedida?.descripcion,
      precioUnitario: item.precioUnitario,
      ivaLabel: item.afectacionIva === 'GRAVADO' ? `${item.tasaIva}%` : item.afectacionIva,
      total: item.total,
    })),
    subtotalExenta: comprobante.subtotalExenta,
    subtotalGravada5: comprobante.subtotalGravada5,
    subtotalGravada10: comprobante.subtotalGravada10,
    iva5: comprobante.iva5,
    iva10: comprobante.iva10,
    total: comprobante.total,
  };
}

export default function ComprobantePrintPage() {
  const { id } = useParams<{ id: string }>();
  const { usuario, loading } = useAuth();

  const { data: comprobante, isLoading } = useQuery({
    queryKey: ['comprobante', id],
    queryFn: async () => (await api.get<Comprobante>(`/comprobantes/${id}`)).data,
    enabled: Boolean(usuario) && Boolean(id),
  });

  useEffect(() => {
    if (comprobante) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [comprobante]);

  if (loading) return <PageSpinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (isLoading || !comprobante) return <PageSpinner />;

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 print:hidden">
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
      <ComprobanteVisual data={toVisualData(comprobante)} />
    </div>
  );
}
