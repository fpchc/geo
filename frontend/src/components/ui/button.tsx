import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] text-xs font-medium transition-[transform,box-shadow,background-color,border-color,color,filter] duration-200 ease-swift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'text-primary-foreground shadow-primary [background:var(--accent-grad)] hover:-translate-y-[1.5px] hover:saturate-[1.06] hover:shadow-primary-hover active:translate-y-0 active:scale-[0.985] disabled:cursor-progress',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-[0.985]',
        outline:
          'border border-input bg-card text-muted-foreground hover:-translate-y-px hover:border-primary/30 hover:text-foreground active:translate-y-0',
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'border border-transparent text-foreground hover:bg-muted hover:text-foreground',
      },
      size: {
        default: 'h-[34px] px-3.5 py-1.5',
        sm: 'h-8 rounded-[9px] px-3 text-xs',
        lg: 'h-9 px-4 text-sm',
        icon: 'size-8 rounded-[9px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
