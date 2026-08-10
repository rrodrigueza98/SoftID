import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { Deposito, Producto, TipoMovimientoStock } from '../lib/types';

const TIPOS: { value: TipoMovimientoStock; label: string; grupo: 'Entrada' | 'Salida' | 'Transferencia' }[] = [
  { value: 'COMPRA', label: 'Compra', grupo: 'Entrada' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste positivo', grupo: 'Entrada' },
  { value: 'DEVOLUCION_VENTA', label: 'Devolución de venta', grupo: 'Entrada' },
  { value: 'INVENTARIO_INICIAL', label: 'Inventario inicial', grupo: 'Entrada' },
  { value: 'VENTA', label: 'Venta', grupo: 'Salida' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste negativo', grupo: 'Salida' },
  { value: 'DEVOLUCION_COMPRA', label: 'Devolución a proveedor', grupo: 'Salida' },
  { value: 'TRANSFERENCIA_SALIDA', label: 'Transferencia entre depósitos', grupo: 'Transferencia' },
];

export function MovimientoStockFormDialog({
  open,
  onClose,
  depositos,
}: {
  open: boolean;
  onClose: () => void;
  depositos: Deposito[];
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [depositoId, setDepositoId] = useState(depositos[0]?.id ?? '');
  const [depositoDestinoId, setDepositoDestinoId] = useState('');
  const [tipo, setTipo] = useState<TipoMovimientoStock>('COMPRA');
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El dialogo esta siempre montado (StockPage lo renderiza sin importar
  // "open"), asi que en la primerisima carga de la pagina el useState de
  // arriba se inicializa ANTES de que responda la consulta de depositos --
  // queda "" para siempre y el <select> nunca dispara su onChange porque el
  // usuario nunca toco el unico deposito ya "elegido" visualmente. Sin este
  // efecto, el boton Registrar queda deshabilitado en silencio (sin error)
  // apenas se abre la pantalla por primera vez.
  useEffect(() => {
    if (!depositoId && depositos.length > 0) setDepositoId(depositos[0].id);
  }, [depositos, depositoId]);

  const { data: productos } = useQuery({
    queryKey: ['productos-select', empresaId],
    queryFn: async () => (await api.get<Producto[]>('/productos', { params: { empresaId } })).data,
    enabled: open,
  });

  const esTransferencia = tipo === 'TRANSFERENCIA_SALIDA';

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/movimientos-stock', {
        productoId,
        depositoId,
        depositoDestinoId: esTransferencia ? depositoDestinoId : undefined,
        tipo,
        cantidad: Number(cantidad),
        costoUnitario: costoUnitario ? Number(costoUnitario) : undefined,
        observacion: observacion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos-stock'] });
      reset();
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function reset() {
    setProductoId('');
    setCantidad('');
    setCostoUnitario('');
    setObservacion('');
    setDepositoDestinoId('');
    setError(null);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Registrar movimiento de stock" width="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField label="Tipo de movimiento" required>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimientoStock)}>
            {(['Entrada', 'Salida', 'Transferencia'] as const).map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {TIPOS.filter((t) => t.grupo === grupo).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormField>

        <FormField label="Producto" required>
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
            <option value="" disabled>
              Elegir…
            </option>
            {productos
              ?.filter((p) => p.controlaStock)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descripcion}
                </option>
              ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={esTransferencia ? 'Depósito origen' : 'Depósito'} required>
            <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} required>
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </FormField>
          {esTransferencia && (
            <FormField label="Depósito destino" required>
              <Select value={depositoDestinoId} onChange={(e) => setDepositoDestinoId(e.target.value)} required>
                <option value="" disabled>
                  Elegir…
                </option>
                {depositos
                  .filter((d) => d.id !== depositoId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
              </Select>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cantidad" required>
            <Input type="number" min="0" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
          </FormField>
          {tipo === 'COMPRA' && (
            <FormField label="Costo unitario (₲)">
              <Input type="number" min="0" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} />
            </FormField>
          )}
        </div>

        <FormField label="Observación">
          <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </FormField>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !productoId || !depositoId}>
            {mutation.isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
