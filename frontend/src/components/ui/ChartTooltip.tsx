export function ChartTooltip({
  active,
  payload,
  formatearEtiqueta,
}: {
  active?: boolean;
  payload?: { payload: Record<string, unknown> }[];
  formatearEtiqueta: (row: Record<string, unknown>) => { titulo: string; lineas: string[] };
}) {
  if (!active || !payload?.length) return null;
  const { titulo, lineas } = formatearEtiqueta(payload[0].payload);
  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-ink-900">{titulo}</p>
      {lineas.map((l) => (
        <p key={l} className="mt-0.5 text-ink-600">
          {l}
        </p>
      ))}
    </div>
  );
}
