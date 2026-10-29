import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor to associate the label.
    <label
      data-slot="label"
      className={cn('text-xs leading-none font-medium text-foreground', className)}
      {...props}
    />
  );
}

export { Label };
