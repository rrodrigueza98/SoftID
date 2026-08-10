import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { CuentaBancaria, TipoMovimientoBancario } from '../lib/types';

export function MovimientoBancarioFormDialog({
  open,
  onClose,
  cuentaBancaria,
}: {
  open: boolean;
  onClose: () => void;
  cuentaBancaria: CuentaBancaria;
}) {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoBancario>('CREDITO');
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/movimientos-bancarios', {
        cuentaBancariaId: cuentaBancaria.id,
        fecha,
        concepto,
        tipo,
        monto: Number(monto),
        referencia: referencia || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos-bancarios', cuentaBancaria.id] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-bancaria-saldo', cuentaBancaria.id] });
      setConcepto('');
      setMonto('');
      setReferencia('');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const puedeGuardar = fecha && concepto && Number(monto) > 0;

  return (
    <Dialog open={open} onClose={onClose} title={`Registrar movimiento — ${cuentaBancaria.nombre}`} width="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField label="Fecha" required>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required autoFocus />
        </FormField>

        <FormField label="Concepto" required>
          <Input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Transferencia recibida, pago a proveedor…"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipo" required>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimientoBancario)}>
              <option value="CREDITO">Crédito (ingreso)</option>
              <option value="DEBITO">Débito (egreso)</option>
            </Select>
          </FormField>
          <FormField label="Monto (₲)" required>
            <Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
          </FormField>
        </div>

        <FormField label="Referencia (opcional)">
          <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº de operación, cheque, etc." />
        </FormField>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!puedeGuardar || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
