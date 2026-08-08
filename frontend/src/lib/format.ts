const guaranies = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 });

export function formatGs(value: string | number) {
  return `₲ ${guaranies.format(Number(value))}`;
}

// Estas fechas representan un dia calendario (fecha de traslado, vigencia de
// timbrado, etc.), no un instante puntual, y se guardan/envian como
// medianoche UTC. Leerlas con los getters locales corre el dia hacia atras
// en husos horarios negativos (como America/Asuncion), asi que siempre se
// leen los componentes UTC en vez de delegar en toLocaleDateString.
export function formatDate(value: string) {
  const date = new Date(value);
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
