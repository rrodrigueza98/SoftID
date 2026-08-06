const guaranies = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 });

export function formatGs(value: string | number) {
  return `₲ ${guaranies.format(Number(value))}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
