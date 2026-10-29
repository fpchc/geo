import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  message,
  hint,
  className,
}: {
  message: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
