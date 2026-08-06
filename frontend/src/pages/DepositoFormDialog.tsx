import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api-client';
import { useEmpresaId } from '../lib/hooks';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Field';

export function DepositoFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const empresaId = useEmpresaId();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post('/depositos', { empresaId, nombre, direccion: direccion || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depositos'] });
      setNombre('');
      setDireccion('');
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo depósito" width="sm">
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
        <FormField label="Dirección">
          <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
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
