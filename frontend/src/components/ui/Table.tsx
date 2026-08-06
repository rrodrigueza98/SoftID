import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-ink-200 bg-ink-50 text-left">{children}</thead>;
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-ink-800', className)}>{children}</td>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b border-ink-100 last:border-0', onClick && 'cursor-pointer hover:bg-ink-50')}
    >
      {children}
    </tr>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="px-4 py-10 text-center text-sm text-ink-400">{message}</div>;
}
