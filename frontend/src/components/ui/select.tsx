import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Select({
  className,
  containerClassName,
  children,
  ...props
}: ComponentProps<'select'> & { containerClassName?: string }) {
  return (
    <span className={cn('relative block w-full', containerClassName)}>
      <select
        data-slot="select"
        className={cn(
          'peer flex h-[34px] w-full appearance-none rounded-[9px] border border-input bg-card px-2.5 pr-8 text-xs transition-[border-color,box-shadow,background-color] duration-200 ease-swift hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { Select };
