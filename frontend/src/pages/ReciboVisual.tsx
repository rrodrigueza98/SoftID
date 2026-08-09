import { formatDate, formatGs } from '../lib/format';
import type { FormaPago } from '../lib/types';

const FORMA_PAGO_LABEL: Record<FormaPago, string> = {
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  TARJETA_CREDITO: 'Tarjeta de crédito',
  TARJETA_DEBITO: 'Tarjeta de débito',
  TRANSFERENCIA: 'Transferencia',
  GIRO: 'Giro',
  BILLETERA_ELECTRONICA: 'Billetera electrónica',
  TARJETA_EMPRESARIAL: 'Tarjeta empresarial',
  VALE: 'Vale',
  RETENCION: 'Retención',
  PAGO_ANTICIPO: 'Pago por anticipo',
  VALOR_FISCAL: 'Valor fiscal',
  VALOR_COMERCIAL: 'Valor comercial',
  COMPENSACION: 'Compensación',
  PERMUTA: 'Permuta',
  PAGO_BANCARIO: 'Pago bancario',
  PAGO_MOVIL: 'Pago móvil',
  DONACION: 'Donación',
  PROMOCION: 'Promoción',
  CONSUMO_INTERNO: 'Consumo interno',
  PAGO_ELECTRONICO: 'Pago electrónico',
  OTRO: 'Otro',
};

export interface ReciboVisualAplicacion {
  key: string;
  comprobanteNumero: string;
  comprobanteTipo: string;
  montoAplicado: string | number;
}

export interface ReciboVisualData {
  empresa: {
    razonSocial: string;
    nombreFantasia?: string | null;
    ruc: string;
    dvRuc: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    telefono?: string | null;
    logoUrl?: string | null;
  } | null;
  numero: string;
  fecha: string;
  terceroNombre: string;
  terceroDocumento?: string;
  monto: string | number;
  formaPago: FormaPago;
  observacion?: string | null;
  aplicaciones: ReciboVisualAplicacion[];
  esPreview?: boolean;
}

// Mismo criterio que ComprobanteVisual: una sola pieza presentacional, usada
// tanto por la pagina de impresion (datos guardados) como por la
// previsualizacion dentro del formulario (datos todavia no guardados).
export function ReciboVisual({ data }: { data: ReciboVisualData }) {
  const totalAplicado = data.aplicaciones.reduce((sum, a) => sum + Number(a.montoAplicado), 0);
  const saldoACuenta = Number(data.monto) - totalAplicado;

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-ink-900 print:p-0">
      {data.esPreview && (
        <div className="mb-4 rounded-md border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 print:hidden">
          Vista previa — todavía no se registró el cobro. El número se confirma recién al emitir.
        </div>
      )}

      <div className="flex items-start justify-between border-2 border-ink-900 p-4">
        <div className="flex max-w-[55%] items-start gap-3">
          {data.empresa?.logoUrl && (
            <img src={data.empresa.logoUrl} alt="" className="h-14 w-14 shrink-0 object-contain" />
          )}
          <div>
            <p className="text-base font-bold">{data.empresa?.razonSocial ?? '—'}</p>
            {data.empresa?.nombreFantasia && <p className="text-sm">{data.empresa.nombreFantasia}</p>}
            <p className="mt-1 text-xs">
              RUC: {data.empresa?.ruc}-{data.empresa?.dvRuc}
            </p>
            <p className="text-xs">{data.empresa?.direccion}</p>
            <p className="text-xs">
              {data.empresa?.ciudad}, {data.empresa?.departamento}
            </p>
          </div>
        </div>
        <div className="max-w-[40%] border-l-2 border-ink-900 pl-4 text-right">
          <p className="text-sm font-bold uppercase">Recibo de cobro</p>
          <p className="mt-1 font-mono text-lg font-bold">Nº {data.numero}</p>
          <p className="mt-1 text-xs">Fecha: {formatDate(data.fecha)}</p>
        </div>
      </div>

      <div className="mt-4 border border-ink-300 p-3 text-xs">
        <p>
          <span className="font-semibold">Recibí de: </span>
          {data.terceroNombre}
          {data.terceroDocumento && <span className="text-ink-500"> ({data.terceroDocumento})</span>}
        </p>
        <p className="mt-1">
          <span className="font-semibold">Forma de pago: </span>
          {FORMA_PAGO_LABEL[data.formaPago]}
        </p>
        {data.observacion && (
          <p className="mt-1">
            <span className="font-semibold">Observación: </span>
            {data.observacion}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-y-2 border-ink-900 py-3">
        <span className="text-sm font-semibold">La suma de guaraníes</span>
        <span className="text-2xl font-bold tabular-nums">{formatGs(data.monto)}</span>
      </div>

      {data.aplicaciones.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Aplicado a</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink-300 text-left">
                <th className="py-1">Comprobante</th>
                <th className="py-1 text-right">Monto aplicado</th>
              </tr>
            </thead>
            <tbody>
              {data.aplicaciones.map((a) => (
                <tr key={a.key} className="border-b border-ink-100">
                  <td className="py-1">
                    {a.comprobanteTipo} Nº {a.comprobanteNumero}
                  </td>
                  <td className="py-1 text-right tabular-nums">{formatGs(a.montoAplicado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {saldoACuenta > 0 && (
            <p className="mt-1.5 text-right text-xs text-ink-500">
              Sin aplicar (a cuenta): <span className="tabular-nums">{formatGs(saldoACuenta)}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
        <div className="border-t border-ink-400 pt-1">Firma quien entrega</div>
        <div className="border-t border-ink-400 pt-1">Firma quien recibe</div>
      </div>
    </div>
  );
}
