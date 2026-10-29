'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatCount } from '@/lib/motion/format';
import { cn } from '@/lib/utils';

export function NumberCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  grouped,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  grouped?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const rendered = `${prefix}${formatCount(value, { decimals, grouped })}${suffix}`;

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (reduced) {
      element.textContent = rendered;
      return;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;

    void import('motion').then(({ animate }) => {
      if (cancelled) {
        return;
      }

      const controls = animate(0, value, {
        duration: 0.9,
        ease: [0.33, 1, 0.68, 1],
        onUpdate: (latest) => {
          element.textContent = `${prefix}${formatCount(latest, { decimals, grouped })}${suffix}`;
        },
        onComplete: () => {
          element.textContent = rendered;
        },
      });

      stop = () => controls.stop();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [value, prefix, suffix, decimals, grouped, reduced, rendered]);

  return (
    <span ref={ref} className={cn('tnum', className)}>
      {rendered}
    </span>
  );
}
