import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function StatTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white px-5 py-4',
        tone === 'warning' ? 'border-amber-300 bg-amber-50' : 'border-ink-200',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
