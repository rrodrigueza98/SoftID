import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { ReciboVisual, type ReciboVisualData } from './ReciboVisual';
import { TIPO_DOCUMENTO_ABREVIADO } from './comprobante-labels';
import type { Comprobante, CuentaBancaria, Empresa, FormaPago, Tercero } from '../lib/types';

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'BILLETERA_ELECTRONICA', label: 'Billetera electrónica' },
  { value: 'OTRO', label: 'Otro' },
];

// Formas de pago que entran por una cuenta bancaria real -- para estas se
// ofrece elegir la cuenta bancaria puntual y asi generar el movimiento en
// Bancos listo para conciliar (ver RecibosService.create).
const FORMAS_PAGO_BANCARIAS = new Set<FormaPago>(['TRANSFERENCIA', 'CHEQUE', 'BILLETERA_ELECTRONICA']);

export function ReciboFormDialog({
  open,
  onClose,
  tercero,
}: {
  open: boolean;
  onClose: () => void;
  tercero: Tercero;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('EFECTIVO');
  const [comprobanteId, setComprobanteId] = useState('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [reciboCreado, setReciboCreado] = useState<{ id: string; numero: string } | null>(null);
  const esBancario = FORMAS_PAGO_BANCARIAS.has(formaPago);

  const { data: empresa } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => (await api.get<Empresa>(`/empresas/${empresaId}`)).data,
    enabled: open,
  });

  const { data: comprobantes } = useQuery({
    queryKey: ['comprobantes', tercero.id],
    queryFn: async () =>
      // Solo facturas EMITIDAS a credito tienen saldo pendiente para cobrar --
      // las de contado ya se saldaron en el momento de la venta.
      (await api.get<Comprobante[]>('/comprobantes', { params: { empresaId, clienteId: tercero.id } })).data.filter(
        (c) => c.estado === 'EMITIDO' && c.condicionVenta === 'CREDITO',
      ),
    enabled: open,
  });

  // Se ofrece elegir la cuenta bancaria solo para formas de pago bancarias.
  // Si la consulta falla (ej. operador sin acceso a Bancos), simplemente no
  // se muestra el selector y el cobro se registra igual, sin enlazar banco.
  const { data: cuentasBancarias } = useQuery({
    queryKey: ['cuentas-bancarias', empresaId],
    queryFn: async () => (await api.get<CuentaBancaria[]>('/cuentas-bancarias', { params: { empresaId } })).data,
    enabled: open && esBancario,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    setMonto('');
    setComprobanteId('');
    setFormaPago('EFECTIVO');
    setCuentaBancariaId('');
    setError(null);
    setPreviewing(false);
    setReciboCreado(null);
  }, [open]);

  useEffect(() => {
    if (!esBancario) setCuentaBancariaId('');
  }, [esBancario]);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ id: string; numero: string }>('/recibos', {
          empresaId,
          terceroId: tercero.id,
          monto: Number(monto),
          formaPago,
          cuentaBancariaId: esBancario && cuentaBancariaId ? cuentaBancariaId : undefined,
          aplicaciones: comprobanteId ? [{ comprobanteId, montoAplicado: Number(monto) }] : [],
        })
      ).data,
    onSuccess: (recibo) => {
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente', tercero.id] });
      queryClient.invalidateQueries({ queryKey: ['terceros'] });
      queryClient.invalidateQueries({ queryKey: ['empresa', empresaId] });
      if (cuentaBancariaId) {
        queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios', cuentaBancariaId] });
        queryClient.invalidateQueries({ queryKey: ['cuenta-bancaria-saldo', cuentaBancariaId] });
      }
      setReciboCreado({ id: recibo.id, numero: recibo.numero });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const comprobanteAplicado = comprobantes?.find((c) => c.id === comprobanteId);
  const puedeRegistrar = Boolean(monto) && Number(monto) > 0;

  const previewData: ReciboVisualData = {
    empresa: empresa ?? null,
    numero: empresa ? String(empresa.proximoNumeroRecibo).padStart(7, '0') : '(sin número)',
    fecha: new Date().toISOString(),
    terceroNombre: tercero.razonSocial,
    terceroDocumento: tercero.numeroDocumento,
    monto: monto || 0,
    formaPago,
    aplicaciones: comprobanteAplicado
      ? [
          {
            key: comprobanteAplicado.id,
            comprobanteNumero: comprobanteAplicado.numero,
            comprobanteTipo: TIPO_DOCUMENTO_ABREVIADO[comprobanteAplicado.tipoDocumento],
            montoAplicado: monto || 0,
          },
        ]
      : [],
    esPreview: true,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={reciboCreado ? 'Cobro registrado' : previewing ? 'Vista previa del recibo' : `Registrar cobro — ${tercero.razonSocial}`}
      width={previewing || reciboCreado ? 'lg' : 'md'}
    >
      {reciboCreado ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            ✓
          </div>
          <div>
            <p className="font-medium text-ink-900">Recibo Nº {reciboCreado.numero} registrado</p>
            <p className="mt-1 text-sm text-ink-500">El cobro ya se aplicó a la cuenta corriente de {tercero.razonSocial}.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => window.open(`/imprimir/recibos/${reciboCreado.id}`, '_blank')}>Imprimir recibo</Button>
          </div>
        </div>
      ) : previewing ? (
        <div className="flex flex-col gap-4">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="max-h-[70vh] overflow-y-auto border border-ink-200">
            <ReciboVisual data={previewData} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setError(null);
                setPreviewing(false);
              }}
            >
              Volver a editar
            </Button>
            <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Registrando…' : 'Confirmar cobro'}
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPreviewing(true);
          }}
          className="flex flex-col gap-4"
        >
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <FormField label="Monto (₲)" required>
            <Input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required autoFocus />
          </FormField>

          <FormField label="Forma de pago" required>
            <Select value={formaPago} onChange={(e) => setFormaPago(e.target.value as FormaPago)}>
              {FORMAS_PAGO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>

          {esBancario && cuentasBancarias && cuentasBancarias.length > 0 && (
            <FormField label="Cuenta bancaria (opcional, para reflejar el movimiento en Bancos)">
              <Select value={cuentaBancariaId} onChange={(e) => setCuentaBancariaId(e.target.value)}>
                <option value="">No registrar en Bancos</option>
                {cuentasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {c.banco} · {c.numeroCuenta}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Aplicar a factura (opcional)">
            <Select value={comprobanteId} onChange={(e) => setComprobanteId(e.target.value)}>
              <option value="">Cobro a cuenta (sin aplicar a una factura puntual)</option>
              {comprobantes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tipoDocumento} Nº {c.numero} — {formatGs(c.total)}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!puedeRegistrar}>
              Previsualizar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
