import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { formatDate, formatGs } from '../lib/format';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input, Select, FormField } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState, Table, Thead, Th, Tr, Td } from '../components/ui/Table';
import { RucSearchBox, type ResultadoBusquedaRuc } from '../components/RucSearch';
import type { AtribucionCreditoF120, Compra, CondicionVenta, CuentaContable, FormaPago, Tercero } from '../lib/types';

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
  { value: 'OTRO', label: 'Otro' },
];

// Formulario 120, Rubro 3: a que se atribuye el credito fiscal de esta
// compra. DIRECTA_GRAVADA es el caso normal (la gran mayoria de compras de
// un negocio que solo vende gravado); las otras dos solo aplican si la
// empresa tambien tiene ventas exoneradas/exentas.
const ATRIBUCIONES_CREDITO: { value: AtribucionCreditoF120; label: string }[] = [
  { value: 'DIRECTA_GRAVADA', label: 'Directa a ventas gravadas (caso normal)' },
  { value: 'INDISTINTA', label: 'Uso indistinto (se prorratea)' },
  { value: 'VINCULADA_EXONERADA', label: 'Vinculada a ventas exoneradas (sin crédito fiscal)' },
];

const emptyForm = {
  proveedorId: '',
  numeroComprobante: '',
  timbradoProveedor: '',
  fechaEmision: new Date().toISOString().slice(0, 10),
  concepto: '',
  cuentaContableId: '',
  condicionCompra: 'CONTADO' as CondicionVenta,
  formaPago: 'EFECTIVO' as FormaPago,
  montoExenta: '',
  montoGravada10: '',
  montoGravada5: '',
  atribucionCredito: 'DIRECTA_GRAVADA' as AtribucionCreditoF120,
  observacion: '',
};

export default function ComprasPage() {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: compras, isLoading } = useQuery({
    queryKey: ['compras', empresaId],
    queryFn: async () => (await api.get<Compra[]>('/compras', { params: { empresaId } })).data,
  });

  const { data: proveedores } = useQuery({
    queryKey: ['terceros', { empresaId, tipo: 'PROVEEDOR' }],
    queryFn: async () => (await api.get<Tercero[]>('/terceros', { params: { empresaId, tipo: 'PROVEEDOR' } })).data,
    enabled: open,
  });

  const [rucDialogOpen, setRucDialogOpen] = useState(false);
  const [creandoTercero, setCreandoTercero] = useState(false);
  const [rucDialogError, setRucDialogError] = useState<string | null>(null);

  // Al elegir un resultado de DNIT: si ya existe un proveedor con ese RUC lo
  // seleccionamos directo, si no lo damos de alta en el momento (con lo
  // minimo indispensable) para no cortar el flujo de carga de la compra.
  const elegirProveedorDnit = async (r: ResultadoBusquedaRuc) => {
    const existente = proveedores?.find((p) => p.numeroDocumento === r.ruc);
    if (existente) {
      setForm((f) => ({ ...f, proveedorId: existente.id }));
      setRucDialogOpen(false);
      return;
    }

    setCreandoTercero(true);
    setRucDialogError(null);
    try {
      const nuevo = (
        await api.post<Tercero>('/terceros', {
          empresaId,
          tipo: 'PROVEEDOR',
          tipoDocumento: 'RUC',
          numeroDocumento: r.ruc,
          dvRuc: r.dv,
          razonSocial: r.razonSocial,
          activo: true,
        })
      ).data;
      await queryClient.invalidateQueries({ queryKey: ['terceros', { empresaId, tipo: 'PROVEEDOR' }] });
      setForm((f) => ({ ...f, proveedorId: nuevo.id }));
      setRucDialogOpen(false);
    } catch (err) {
      setRucDialogError(apiErrorMessage(err));
    } finally {
      setCreandoTercero(false);
    }
  };

  const { data: cuentas } = useQuery({
    queryKey: ['cuentas-contables', empresaId],
    queryFn: async () => (await api.get<CuentaContable[]>('/cuentas-contables', { params: { empresaId } })).data,
    enabled: open,
  });

  // Solo cuentas de Egreso (gastos) o Activo imputables tienen sentido como
  // contrapartida de una compra -- el resto (Pasivo/Patrimonio/Ingreso) no.
  const cuentasImputables = cuentas?.filter((c) => c.imputable && (c.tipo === 'EGRESO' || c.tipo === 'ACTIVO'));

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/compras', {
        empresaId,
        proveedorId: form.proveedorId,
        numeroComprobante: form.numeroComprobante,
        timbradoProveedor: form.timbradoProveedor || undefined,
        fechaEmision: form.fechaEmision,
        concepto: form.concepto,
        cuentaContableId: form.cuentaContableId,
        condicionCompra: form.condicionCompra,
        formaPago: form.condicionCompra === 'CONTADO' ? form.formaPago : undefined,
        montoExenta: form.montoExenta ? Number(form.montoExenta) : 0,
        montoGravada10: form.montoGravada10 ? Number(form.montoGravada10) : 0,
        montoGravada5: form.montoGravada5 ? Number(form.montoGravada5) : 0,
        atribucionCredito: tieneGravada ? form.atribucionCredito : undefined,
        observacion: form.observacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras', empresaId] });
      setOpen(false);
      setForm(emptyForm);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const anularMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/compras/${id}/anular`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras', empresaId] }),
  });

  const totalPreview =
    (Number(form.montoExenta) || 0) +
    (Number(form.montoGravada10) || 0) * 1.1 +
    (Number(form.montoGravada5) || 0) * 1.05;
  const tieneGravada = (Number(form.montoGravada10) || 0) > 0 || (Number(form.montoGravada5) || 0) > 0;

  const puedeRegistrar = form.proveedorId && form.numeroComprobante && form.concepto && form.cuentaContableId && totalPreview > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Compras</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setError(null);
            setOpen(true);
          }}
        >
          Nueva compra
        </Button>
      </div>

      <Card>
        <CardHeader title="Comprobantes de compra registrados" />
        {isLoading ? (
          <PageSpinner />
        ) : !compras || compras.length === 0 ? (
          <EmptyState message="Todavía no registraste ninguna compra." />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Proveedor</Th>
                <Th>Nº comprobante</Th>
                <Th>Concepto</Th>
                <Th>Cuenta</Th>
                <Th className="text-right">Total</Th>
                <Th>Condición</Th>
                <Th>Estado</Th>
                <Th>{''}</Th>
              </tr>
            </Thead>
            <tbody>
              {compras.map((c) => (
                <Tr key={c.id}>
                  <Td className="text-ink-500">{formatDate(c.fechaEmision)}</Td>
                  <Td className="font-medium text-ink-900">{c.proveedor?.razonSocial ?? '—'}</Td>
                  <Td className="font-mono text-ink-900">{c.numeroComprobante}</Td>
                  <Td className="text-ink-700">{c.concepto}</Td>
                  <Td className="text-ink-500">{c.cuentaContable ? `${c.cuentaContable.codigo} ${c.cuentaContable.nombre}` : '—'}</Td>
                  <Td className="text-right tabular-nums">{formatGs(c.total)}</Td>
                  <Td className="text-ink-500">{c.condicionCompra === 'CREDITO' ? 'Crédito' : 'Contado'}</Td>
                  <Td>
                    <Badge tone={c.estado === 'EMITIDO' ? 'success' : c.estado === 'ANULADO' ? 'danger' : 'neutral'}>{c.estado}</Badge>
                  </Td>
                  <Td>
                    {c.estado === 'EMITIDO' && (
                      <button
                        onClick={() => confirm(`¿Anular la compra Nº ${c.numeroComprobante}?`) && anularMutation.mutate(c.id)}
                        className="text-xs font-medium text-red-600 underline decoration-dotted hover:text-red-700"
                      >
                        Anular
                      </button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva compra" width="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Proveedor" required>
              <div className="flex gap-2">
                <Select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} required>
                  <option value="">Elegir…</option>
                  {proveedores?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razonSocial}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRucDialogError(null);
                    setRucDialogOpen(true);
                  }}
                >
                  Buscar en DNIT
                </Button>
              </div>
            </FormField>
            <FormField label="Fecha" required>
              <Input type="date" value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} required />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nº de comprobante del proveedor" required>
              <Input
                value={form.numeroComprobante}
                onChange={(e) => setForm({ ...form, numeroComprobante: e.target.value })}
                placeholder="Ej. 001-001-0001234"
                required
              />
            </FormField>
            <FormField label="Timbrado del proveedor (opcional)">
              <Input value={form.timbradoProveedor} onChange={(e) => setForm({ ...form, timbradoProveedor: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Concepto / descripción del gasto" required>
            <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required autoFocus />
          </FormField>

          <FormField label="Cuenta contable" required>
            <Select value={form.cuentaContableId} onChange={(e) => setForm({ ...form, cuentaContableId: e.target.value })} required>
              <option value="">Elegir…</option>
              {cuentasImputables?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Monto exenta (₲)">
              <Input type="number" min="0" value={form.montoExenta} onChange={(e) => setForm({ ...form, montoExenta: e.target.value })} />
            </FormField>
            <FormField label="Gravada 10% (₲, base sin IVA)">
              <Input type="number" min="0" value={form.montoGravada10} onChange={(e) => setForm({ ...form, montoGravada10: e.target.value })} />
            </FormField>
            <FormField label="Gravada 5% (₲, base sin IVA)">
              <Input type="number" min="0" value={form.montoGravada5} onChange={(e) => setForm({ ...form, montoGravada5: e.target.value })} />
            </FormField>
          </div>

          {tieneGravada && (
            <FormField label="Atribución del crédito fiscal (Formulario 120)">
              <Select
                value={form.atribucionCredito}
                onChange={(e) => setForm({ ...form, atribucionCredito: e.target.value as AtribucionCreditoF120 })}
              >
                {ATRIBUCIONES_CREDITO.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Condición" required>
              <Select
                value={form.condicionCompra}
                onChange={(e) => setForm({ ...form, condicionCompra: e.target.value as CondicionVenta })}
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </Select>
            </FormField>
            {form.condicionCompra === 'CONTADO' && (
              <FormField label="Forma de pago">
                <Select value={form.formaPago} onChange={(e) => setForm({ ...form, formaPago: e.target.value as FormaPago })}>
                  {FORMAS_PAGO.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>

          <FormField label="Observación (opcional)">
            <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          </FormField>

          <div className="flex items-center justify-between border-t border-ink-100 pt-3">
            <span className="text-sm text-ink-500">
              Total: <span className="font-semibold text-ink-900">{formatGs(Math.round(totalPreview * 100) / 100)}</span>
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!puedeRegistrar || mutation.isPending}>
                {mutation.isPending ? 'Registrando…' : 'Registrar compra'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog open={rucDialogOpen} onClose={() => setRucDialogOpen(false)} title="Buscar en DNIT">
        {rucDialogError && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rucDialogError}</div>}
        {creandoTercero ? (
          <p className="py-4 text-center text-sm text-ink-500">Guardando proveedor…</p>
        ) : (
          <RucSearchBox onSelect={elegirProveedorDnit} />
        )}
      </Dialog>
    </div>
  );
}
