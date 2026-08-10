import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { CuentaContable, TipoCuentaBancaria } from '../lib/types';

const TIPOS_CUENTA: { value: TipoCuentaBancaria; label: string }[] = [
  { value: 'CUENTA_CORRIENTE', label: 'Cuenta corriente' },
  { value: 'CAJA_AHORRO', label: 'Caja de ahorro' },
];

export function CuentaBancariaFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [banco, setBanco] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuentaBancaria>('CUENTA_CORRIENTE');
  const [cuentaContableId, setCuentaContableId] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [fechaSaldoInicial, setFechaSaldoInicial] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const { data: cuentasContables } = useQuery({
    queryKey: ['cuentas-contables', empresaId],
    queryFn: async () => (await api.get<CuentaContable[]>('/cuentas-contables', { params: { empresaId } })).data,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/cuentas-bancarias', {
        empresaId,
        banco,
        nombre,
        numeroCuenta,
        tipoCuenta,
        cuentaContableId,
        saldoInicial: Number(saldoInicial),
        fechaSaldoInicial,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-bancarias'] });
      setBanco('');
      setNombre('');
      setNumeroCuenta('');
      setCuentaContableId('');
      setSaldoInicial('0');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const cuentasImputables = cuentasContables?.filter((c) => c.imputable) ?? [];

  const puedeGuardar = banco && nombre && numeroCuenta && cuentaContableId && fechaSaldoInicial;

  return (
    <Dialog open={open} onClose={onClose} title="Nueva cuenta bancaria" width="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField label="Banco" required>
          <Input value={banco} onChange={(e) => setBanco(e.target.value)} required autoFocus />
        </FormField>

        <FormField label="Nombre de la cuenta" required>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Cuenta corriente operativa"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de cuenta" required>
            <Input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} required />
          </FormField>
          <FormField label="Tipo" required>
            <Select value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value as TipoCuentaBancaria)}>
              {TIPOS_CUENTA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Cuenta contable asociada" required>
          <Select value={cuentaContableId} onChange={(e) => setCuentaContableId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {cuentasImputables.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-ink-400">
            Si todavía no tenés una cuenta propia para este banco, creala primero en Contabilidad → Plan de Cuentas.
          </p>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Saldo inicial (₲)" required>
            <Input type="number" step="0.01" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} required />
          </FormField>
          <FormField label="Fecha de saldo inicial" required>
            <Input
              type="date"
              value={fechaSaldoInicial}
              onChange={(e) => setFechaSaldoInicial(e.target.value)}
              required
            />
          </FormField>
        </div>

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
