'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;

    // Route change is the trigger for the entrance animation.
    void pathname;

    if (!element || reduced) {
      return;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;

    void import('gsap').then(({ gsap }) => {
      if (cancelled) {
        return;
      }

      const tween = gsap.fromTo(
        element,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      );

      stop = () => tween.kill();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [pathname, reduced]);

  return <div ref={ref}>{children}</div>;
}
