import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatGs } from '../lib/format';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { Compra, CuentaBancaria, FormaPago, Tercero } from '../lib/types';

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'BILLETERA_ELECTRONICA', label: 'Billetera electrónica' },
  { value: 'OTRO', label: 'Otro' },
];

// Formas de pago que salen por una cuenta bancaria real -- para estas se
// ofrece elegir la cuenta puntual y asi generar el movimiento en Bancos
// listo para conciliar (ver OrdenesPagoService.create). Si no se elige
// ninguna (o la forma de pago es Efectivo), se asume que salio de Caja.
const FORMAS_PAGO_BANCARIAS = new Set<FormaPago>(['TRANSFERENCIA', 'CHEQUE', 'BILLETERA_ELECTRONICA']);

export function OrdenPagoFormDialog({
  open,
  onClose,
  proveedor,
}: {
  open: boolean;
  onClose: () => void;
  proveedor: Tercero;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('EFECTIVO');
  const [compraId, setCompraId] = useState('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ordenCreada, setOrdenCreada] = useState<{ id: string; numero: string } | null>(null);
  const esBancario = FORMAS_PAGO_BANCARIAS.has(formaPago);

  const { data: compras } = useQuery({
    queryKey: ['compras', proveedor.id],
    queryFn: async () =>
      // Solo compras EMITIDAS a credito tienen saldo pendiente para pagar --
      // las de contado ya se saldaron en el momento de la compra.
      (await api.get<Compra[]>('/compras', { params: { empresaId, proveedorId: proveedor.id } })).data.filter(
        (c) => c.estado === 'EMITIDO' && c.condicionCompra === 'CREDITO',
      ),
    enabled: open,
  });

  // Se ofrece elegir la cuenta bancaria solo para formas de pago bancarias.
  // Si la consulta falla (ej. operador sin acceso a Bancos), simplemente no
  // se muestra el selector y el pago se registra igual, contra Caja.
  const { data: cuentasBancarias } = useQuery({
    queryKey: ['cuentas-bancarias', empresaId],
    queryFn: async () => (await api.get<CuentaBancaria[]>('/cuentas-bancarias', { params: { empresaId } })).data,
    enabled: open && esBancario,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    setMonto('');
    setCompraId('');
    setFormaPago('EFECTIVO');
    setCuentaBancariaId('');
    setError(null);
    setOrdenCreada(null);
  }, [open]);

  useEffect(() => {
    if (!esBancario) setCuentaBancariaId('');
  }, [esBancario]);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ id: string; numero: string }>('/ordenes-pago', {
          empresaId,
          proveedorId: proveedor.id,
          monto: Number(monto),
          formaPago,
          cuentaBancariaId: esBancario && cuentaBancariaId ? cuentaBancariaId : undefined,
          aplicaciones: compraId ? [{ compraId, montoAplicado: Number(monto) }] : [],
        })
      ).data,
    onSuccess: (ordenPago) => {
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente', proveedor.id] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente-movimientos'] });
      queryClient.invalidateQueries({ queryKey: ['terceros'] });
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      if (cuentaBancariaId) {
        queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios', cuentaBancariaId] });
        queryClient.invalidateQueries({ queryKey: ['cuenta-bancaria-saldo', cuentaBancariaId] });
      }
      setOrdenCreada({ id: ordenPago.id, numero: ordenPago.numero });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const puedeRegistrar = Boolean(monto) && Number(monto) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={ordenCreada ? 'Pago registrado' : `Registrar pago — ${proveedor.razonSocial}`}
    >
      {ordenCreada ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            ✓
          </div>
          <div>
            <p className="font-medium text-ink-900">Orden de Pago Nº {ordenCreada.numero} registrada</p>
            <p className="mt-1 text-sm text-ink-500">
              El pago ya se aplicó a la cuenta corriente de {proveedor.razonSocial}.
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
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

          <FormField label="Aplicar a compra (opcional)">
            <Select value={compraId} onChange={(e) => setCompraId(e.target.value)}>
              <option value="">Pago a cuenta (sin aplicar a una compra puntual)</option>
              {compras?.map((c) => (
                <option key={c.id} value={c.id}>
                  Nº {c.numeroComprobante} — {formatGs(c.total)}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!puedeRegistrar || mutation.isPending}>
              {mutation.isPending ? 'Registrando…' : 'Registrar pago'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
