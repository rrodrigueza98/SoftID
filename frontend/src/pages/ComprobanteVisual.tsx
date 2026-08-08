import { formatDate, formatGs } from '../lib/format';
import {
  MODALIDAD_TRANSPORTE_LABEL,
  MOTIVO_REMISION_LABEL,
  NATURALEZA_TRANSPORTISTA_LABEL,
  NATURALEZA_VENDEDOR_AUTOFACTURA_LABEL,
  RESPONSABLE_EMISION_REMISION_LABEL,
  RESPONSABLE_FLETE_LABEL,
  TIPO_DOCUMENTO_IDENTIDAD_LABEL,
  TIPO_TRANSPORTE_LABEL,
  tipoDocumentoLabel,
} from './comprobante-labels';
import type {
  CondicionVenta,
  DatosTransporteRemision,
  DatosVendedorAutofactura,
  TipoDocumentoElectronico,
} from '../lib/types';

export interface ComprobanteVisualItem {
  key: string;
  descripcion: string;
  cantidad: string | number;
  unidad?: string;
  precioUnitario: string | number;
  ivaLabel: string;
  total: string | number;
}

export interface ComprobanteVisualData {
  empresa: {
    razonSocial: string;
    nombreFantasia?: string | null;
    ruc: string;
    dvRuc: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    telefono?: string | null;
  } | null;
  tipoDocumento: TipoDocumentoElectronico;
  numeroCompleto: string;
  timbradoNumero?: string | null;
  timbradoVigenciaDesde?: string | null;
  fechaEmision: string;
  receptorLabel: string;
  receptorNombre: string;
  receptorIdentidadLabel?: string;
  receptorNumeroDocumento?: string;
  receptorDireccion?: string | null;
  condicionVenta: CondicionVenta;
  motivoEmisionLabel?: string | null;
  items: ComprobanteVisualItem[];
  subtotalExenta: string | number;
  subtotalGravada5: string | number;
  subtotalGravada10: string | number;
  iva5: string | number;
  iva10: string | number;
  total: string | number;
  estadoBadge?: { label: string; className: string } | null;
  esPreview?: boolean;
  // false = timbrado tradicional (preimpreso/virtual, sin DTE): se muestra
  // como comprobante simple, sin la leyenda de CDC/firma digital/SIFEN.
  esElectronico: boolean;
  datosTransporteRemision?: DatosTransporteRemision | null;
  datosVendedorAutofactura?: DatosVendedorAutofactura | null;
}

// Componente presentacional puro -- lo usan tanto la pagina de impresion
// (datos reales guardados) como el paso de previsualizacion del formulario
// (datos calculados en el momento, todavia sin guardar). Misma vista para
// que "previsualizar" y "representacion grafica" sean literalmente la misma
// pieza, no dos cosas separadas que se puedan desincronizar.
export function ComprobanteVisual({ data }: { data: ComprobanteVisualData }) {
  const receptor = data.receptorNombre;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-ink-900 print:p-0">
      {data.esPreview && (
        <div className="mb-4 rounded-md border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 print:hidden">
          Vista previa — todavía no se emitió. El número se confirma recién al emitir.
        </div>
      )}

      <div className="flex items-start justify-between border-2 border-ink-900 p-4">
        <div className="max-w-[55%]">
          <p className="text-base font-bold">{data.empresa?.razonSocial ?? '—'}</p>
          {data.empresa?.nombreFantasia && <p className="text-sm">{data.empresa.nombreFantasia}</p>}
          <p className="mt-1 text-xs">
            RUC: {data.empresa?.ruc}-{data.empresa?.dvRuc}
          </p>
          <p className="text-xs">{data.empresa?.direccion}</p>
          <p className="text-xs">
            {data.empresa?.ciudad}, {data.empresa?.departamento}
          </p>
          {data.empresa?.telefono && <p className="text-xs">Tel: {data.empresa.telefono}</p>}
        </div>
        <div className="max-w-[40%] border-l-2 border-ink-900 pl-4 text-right">
          <p className="text-sm font-bold uppercase">{tipoDocumentoLabel(data.tipoDocumento, data.esElectronico)}</p>
          <p className="mt-1 font-mono text-lg font-bold">{data.numeroCompleto}</p>
          {data.timbradoNumero && (
            <>
              <p className="mt-1 text-xs">Timbrado Nº {data.timbradoNumero}</p>
              {data.timbradoVigenciaDesde && (
                <p className="text-xs">Vigente desde {formatDate(data.timbradoVigenciaDesde)}</p>
              )}
            </>
          )}
          <p className="mt-1 text-xs">Fecha emisión: {formatDate(data.fechaEmision)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 border border-ink-300 p-3 text-xs">
        <p>
          <span className="font-semibold">{data.receptorLabel}: </span>
          {receptor || 'Consumidor final'}
        </p>
        <p>
          <span className="font-semibold">Condición de venta: </span>
          {data.condicionVenta === 'CREDITO' ? 'Crédito' : 'Contado'}
        </p>
        {data.receptorNumeroDocumento && (
          <p>
            <span className="font-semibold">{data.receptorIdentidadLabel ?? 'Documento'}: </span>
            {data.receptorNumeroDocumento}
          </p>
        )}
        {data.receptorDireccion && (
          <p>
            <span className="font-semibold">Dirección: </span>
            {data.receptorDireccion}
          </p>
        )}
        {data.motivoEmisionLabel && (
          <p className="col-span-2">
            <span className="font-semibold">Motivo de emisión: </span>
            {data.motivoEmisionLabel}
          </p>
        )}
      </div>

      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-ink-900 text-left">
            <th className="py-1.5">Descripción</th>
            <th className="py-1.5 text-right">Cant.</th>
            <th className="py-1.5">Unidad</th>
            <th className="py-1.5 text-right">Precio unit.</th>
            <th className="py-1.5">IVA</th>
            <th className="py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.key} className="border-b border-ink-200">
              <td className="py-1.5">{item.descripcion || '—'}</td>
              <td className="py-1.5 text-right tabular-nums">{item.cantidad}</td>
              <td className="py-1.5">{item.unidad ?? ''}</td>
              <td className="py-1.5 text-right tabular-nums">{formatGs(item.precioUnitario)}</td>
              <td className="py-1.5">{item.ivaLabel}</td>
              <td className="py-1.5 text-right tabular-nums">{formatGs(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 text-xs">
          {Number(data.subtotalExenta) > 0 && (
            <div className="flex justify-between border-b border-ink-200 py-1">
              <span>Subtotal exento</span>
              <span className="tabular-nums">{formatGs(data.subtotalExenta)}</span>
            </div>
          )}
          {Number(data.subtotalGravada5) > 0 && (
            <div className="flex justify-between border-b border-ink-200 py-1">
              <span>Subtotal 5%</span>
              <span className="tabular-nums">{formatGs(data.subtotalGravada5)}</span>
            </div>
          )}
          {Number(data.subtotalGravada10) > 0 && (
            <div className="flex justify-between border-b border-ink-200 py-1">
              <span>Subtotal 10%</span>
              <span className="tabular-nums">{formatGs(data.subtotalGravada10)}</span>
            </div>
          )}
          {Number(data.iva5) > 0 && (
            <div className="flex justify-between border-b border-ink-200 py-1">
              <span>IVA 5%</span>
              <span className="tabular-nums">{formatGs(data.iva5)}</span>
            </div>
          )}
          {Number(data.iva10) > 0 && (
            <div className="flex justify-between border-b border-ink-200 py-1">
              <span>IVA 10%</span>
              <span className="tabular-nums">{formatGs(data.iva10)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-ink-900 py-1.5 text-sm font-bold">
            <span>Total a pagar</span>
            <span className="tabular-nums">{formatGs(data.total)}</span>
          </div>
        </div>
      </div>

      {data.datosVendedorAutofactura && (
        <div className="mt-4 border border-ink-300 p-3 text-xs">
          <p className="mb-2 text-xs font-bold uppercase">Datos del vendedor</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <p>
              <span className="font-semibold">Vendedor: </span>
              {data.datosVendedorAutofactura.nombreVendedor} (
              {NATURALEZA_VENDEDOR_AUTOFACTURA_LABEL[data.datosVendedorAutofactura.naturalezaVendedor]})
            </p>
            <p>
              <span className="font-semibold">Documento: </span>
              {TIPO_DOCUMENTO_IDENTIDAD_LABEL[data.datosVendedorAutofactura.tipoDocIdentidadVendedor]}{' '}
              {data.datosVendedorAutofactura.numeroDocIdentidadVendedor}
            </p>
            <p className="col-span-2">
              <span className="font-semibold">Domicilio del vendedor: </span>
              {data.datosVendedorAutofactura.direccionVendedor} Nº {data.datosVendedorAutofactura.numeroCasaVendedor},{' '}
              {data.datosVendedorAutofactura.ciudadVendedor}, {data.datosVendedorAutofactura.departamentoVendedor}
            </p>
            <p className="col-span-2">
              <span className="font-semibold">Lugar de la transacción: </span>
              {data.datosVendedorAutofactura.direccionTransaccion}, {data.datosVendedorAutofactura.ciudadTransaccion},{' '}
              {data.datosVendedorAutofactura.departamentoTransaccion}
            </p>
          </div>
        </div>
      )}

      {data.datosTransporteRemision && (
        <div className="mt-4 border border-ink-300 p-3 text-xs">
          <p className="mb-2 text-xs font-bold uppercase">Datos del transporte</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <p>
              <span className="font-semibold">Motivo: </span>
              {MOTIVO_REMISION_LABEL[data.datosTransporteRemision.motivoEmision]}
              {data.datosTransporteRemision.motivoEmision === 'OTRO' && data.datosTransporteRemision.motivoEmisionOtro
                ? ` — ${data.datosTransporteRemision.motivoEmisionOtro}`
                : ''}
            </p>
            <p>
              <span className="font-semibold">Responsable de la emisión: </span>
              {RESPONSABLE_EMISION_REMISION_LABEL[data.datosTransporteRemision.responsableEmision]}
            </p>
            <p>
              <span className="font-semibold">Transporte: </span>
              {TIPO_TRANSPORTE_LABEL[data.datosTransporteRemision.tipoTransporte]} —{' '}
              {MODALIDAD_TRANSPORTE_LABEL[data.datosTransporteRemision.modalidadTransporte]}
            </p>
            <p>
              <span className="font-semibold">Responsable del flete: </span>
              {RESPONSABLE_FLETE_LABEL[data.datosTransporteRemision.responsableFlete]}
            </p>
            <p>
              <span className="font-semibold">Traslado estimado: </span>
              {formatDate(data.datosTransporteRemision.fechaInicioTraslado)} al{' '}
              {formatDate(data.datosTransporteRemision.fechaFinTraslado)}
            </p>
            <p>
              <span className="font-semibold">Salida: </span>
              {data.datosTransporteRemision.direccionSalida} Nº {data.datosTransporteRemision.numeroCasaSalida},{' '}
              {data.datosTransporteRemision.ciudadSalida}, {data.datosTransporteRemision.departamentoSalida}
            </p>
            <p>
              <span className="font-semibold">Entrega: </span>
              {data.datosTransporteRemision.direccionEntrega} Nº {data.datosTransporteRemision.numeroCasaEntrega},{' '}
              {data.datosTransporteRemision.ciudadEntrega}, {data.datosTransporteRemision.departamentoEntrega}
            </p>
            <p>
              <span className="font-semibold">Vehículo: </span>
              {data.datosTransporteRemision.tipoVehiculo} {data.datosTransporteRemision.marcaVehiculo} —{' '}
              {data.datosTransporteRemision.tipoIdentificacionVehiculo === 'MATRICULA'
                ? `Matrícula ${data.datosTransporteRemision.numeroMatriculaVehiculo}`
                : `Nº ident. ${data.datosTransporteRemision.numeroIdentificacionVehiculo}`}
              {data.datosTransporteRemision.numeroVuelo ? ` — Vuelo ${data.datosTransporteRemision.numeroVuelo}` : ''}
            </p>
            <p>
              <span className="font-semibold">Transportista: </span>
              {data.datosTransporteRemision.nombreTransportista} (
              {NATURALEZA_TRANSPORTISTA_LABEL[data.datosTransporteRemision.naturalezaTransportista]}
              {data.datosTransporteRemision.rucTransportista ? ` — RUC ${data.datosTransporteRemision.rucTransportista}` : ''}
              {data.datosTransporteRemision.numeroDocIdentidadTransportista
                ? ` — Doc. ${data.datosTransporteRemision.numeroDocIdentidadTransportista}`
                : ''}
              )
            </p>
            <p>
              <span className="font-semibold">Chofer: </span>
              {data.datosTransporteRemision.nombreChofer} — Doc. {data.datosTransporteRemision.numeroDocIdentidadChofer}
            </p>
          </div>
        </div>
      )}

      {data.esElectronico && (
        <div className="mt-8 border border-dashed border-ink-400 p-3 text-center text-[10px] leading-snug text-ink-500">
          Documento interno generado por el sistema. No constituye Documento Tributario Electrónico válido ante la DNIT
          hasta contar con Código de Control (CDC), firma digital y aprobación de SIFEN.
        </div>
      )}
    </div>
  );
}
