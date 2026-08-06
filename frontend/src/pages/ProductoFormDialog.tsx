import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import { CategoriaFormDialog } from './CategoriaFormDialog';
import type { AfectacionIVA, CategoriaProducto, Producto, UnidadMedida } from '../lib/types';

interface FormState {
  codigo: string;
  codigoBarra: string;
  descripcion: string;
  categoriaId: string;
  unidadMedidaId: string;
  afectacionIva: AfectacionIVA;
  tasaIva: number;
  precioCosto: string;
  precioVenta: string;
  controlaStock: boolean;
  stockMinimo: string;
  activo: boolean;
}

function emptyForm(unidadMedidaId: string): FormState {
  return {
    codigo: '',
    codigoBarra: '',
    descripcion: '',
    categoriaId: '',
    unidadMedidaId,
    afectacionIva: 'GRAVADO',
    tasaIva: 10,
    precioCosto: '',
    precioVenta: '',
    controlaStock: true,
    stockMinimo: '',
    activo: true,
  };
}

export function ProductoFormDialog({
  open,
  onClose,
  producto,
}: {
  open: boolean;
  onClose: () => void;
  producto: Producto | null;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const isEdit = Boolean(producto);
  const [error, setError] = useState<string | null>(null);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);

  const { data: categorias } = useQuery({
    queryKey: ['categorias-producto', empresaId],
    queryFn: async () => (await api.get<CategoriaProducto[]>('/categorias-producto', { params: { empresaId } })).data,
    enabled: open,
  });
  const { data: unidades } = useQuery({
    queryKey: ['unidades-medida'],
    queryFn: async () => (await api.get<UnidadMedida[]>('/unidades-medida')).data,
    enabled: open,
  });

  const [form, setForm] = useState<FormState>(emptyForm(''));

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (producto) {
      setForm({
        codigo: producto.codigo,
        codigoBarra: producto.codigoBarra ?? '',
        descripcion: producto.descripcion,
        categoriaId: producto.categoriaId ?? '',
        unidadMedidaId: producto.unidadMedidaId,
        afectacionIva: producto.afectacionIva,
        tasaIva: producto.tasaIva,
        precioCosto: producto.precioCosto,
        precioVenta: producto.precioVenta,
        controlaStock: producto.controlaStock,
        stockMinimo: producto.stockMinimo ?? '',
        activo: producto.activo,
      });
    } else {
      setForm(emptyForm(unidades?.[0]?.id ?? ''));
    }
  }, [open, producto, unidades]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empresaId,
        codigo: form.codigo,
        codigoBarra: form.codigoBarra || undefined,
        descripcion: form.descripcion,
        categoriaId: form.categoriaId || undefined,
        unidadMedidaId: form.unidadMedidaId,
        afectacionIva: form.afectacionIva,
        tasaIva: form.afectacionIva === 'EXENTO' || form.afectacionIva === 'EXONERADO' ? 0 : form.tasaIva,
        precioCosto: Number(form.precioCosto),
        precioVenta: Number(form.precioVenta),
        controlaStock: form.controlaStock,
        stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : undefined,
        activo: form.activo,
      };
      if (isEdit) return api.patch(`/productos/${producto!.id}`, payload);
      return api.post('/productos', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const requiereTasa = form.afectacionIva === 'GRAVADO' || form.afectacionIva === 'GRAVADO_PARCIAL';

  return (
    <>
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'} width="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Código (SKU)" required>
            <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
          </FormField>
          <FormField label="Código de barra">
            <Input value={form.codigoBarra} onChange={(e) => setForm({ ...form, codigoBarra: e.target.value })} />
          </FormField>
        </div>

        <FormField label="Descripción" required>
          <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Categoría">
            <div className="flex gap-2">
              <Select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="secondary" size="sm" onClick={() => setCategoriaDialogOpen(true)}>
                + Nueva
              </Button>
            </div>
          </FormField>
          <FormField label="Unidad de medida" required>
            <Select
              value={form.unidadMedidaId}
              onChange={(e) => setForm({ ...form, unidadMedidaId: e.target.value })}
              required
            >
              <option value="" disabled>
                Elegir…
              </option>
              {unidades?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.descripcion}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Afectación de IVA" required>
            <Select
              value={form.afectacionIva}
              onChange={(e) => setForm({ ...form, afectacionIva: e.target.value as AfectacionIVA })}
            >
              <option value="GRAVADO">Gravado</option>
              <option value="GRAVADO_PARCIAL">Gravado parcial</option>
              <option value="EXENTO">Exento</option>
              <option value="EXONERADO">Exonerado</option>
            </Select>
          </FormField>
          {requiereTasa && (
            <FormField label="Tasa de IVA">
              <Select value={form.tasaIva} onChange={(e) => setForm({ ...form, tasaIva: Number(e.target.value) })}>
                <option value={10}>10%</option>
                <option value={5}>5%</option>
              </Select>
            </FormField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio de costo (₲)" required>
            <Input
              type="number"
              min="0"
              value={form.precioCosto}
              onChange={(e) => setForm({ ...form, precioCosto: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Precio de venta (₲)" required>
            <Input
              type="number"
              min="0"
              value={form.precioVenta}
              onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
              required
            />
          </FormField>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.controlaStock}
              onChange={(e) => setForm({ ...form, controlaStock: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Controla stock
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Activo
          </label>
        </div>

        {form.controlaStock && (
          <FormField label="Stock mínimo (alerta)">
            <Input
              type="number"
              min="0"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
            />
          </FormField>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !form.unidadMedidaId}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Dialog>
    <CategoriaFormDialog
      open={categoriaDialogOpen}
      onClose={() => setCategoriaDialogOpen(false)}
      onCreated={(categoria) => setForm((f) => ({ ...f, categoriaId: categoria.id }))}
    />
    </>
  );
}
