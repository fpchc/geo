import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-[34px] shrink-0 place-items-center rounded-[11px] text-sm font-semibold text-white shadow-primary [background:var(--accent-grad)]',
        className,
      )}
      aria-hidden="true"
    >
      G
    </span>
  );
}

export function Brand({
  tagline,
  href,
  className,
  compact = false,
  iconOnly = false,
}: {
  tagline: string;
  href?: string;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const content = (
    <>
      <BrandMark />
      {iconOnly ? null : (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-sm font-semibold text-foreground">GEO Studio</span>
          {compact ? null : (
            <span className="mt-1 truncate text-2xs font-normal text-muted-foreground">
              {tagline}
            </span>
          )}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-2.5 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn('flex items-center gap-2.5', className)}>{content}</div>;
}
