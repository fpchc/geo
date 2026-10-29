import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[160px] w-full resize-y rounded-[9px] border border-input bg-card px-2.5 py-2.5 text-xs leading-[1.7] transition-[border-color,box-shadow,background-color] duration-200 ease-swift placeholder:text-faint hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
