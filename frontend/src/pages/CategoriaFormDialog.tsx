import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Field';
import type { CategoriaProducto } from '../lib/types';

export function CategoriaFormDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (categoria: CategoriaProducto) => void;
}) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [categoriaPadreId, setCategoriaPadreId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: categorias } = useQuery({
    queryKey: ['categorias-producto', empresaId],
    queryFn: async () => (await api.get<CategoriaProducto[]>('/categorias-producto', { params: { empresaId } })).data,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setNombre('');
      setCategoriaPadreId('');
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<CategoriaProducto>('/categorias-producto', {
          empresaId,
          nombre,
          categoriaPadreId: categoriaPadreId || undefined,
        })
      ).data,
    onSuccess: (categoria) => {
      queryClient.invalidateQueries({ queryKey: ['categorias-producto', empresaId] });
      onCreated(categoria);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Nueva categoría" width="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <FormField label="Nombre" required>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </FormField>
        <FormField label="Categoría padre (opcional)">
          <Select value={categoriaPadreId} onChange={(e) => setCategoriaPadreId(e.target.value)}>
            <option value="">Sin categoría padre</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
