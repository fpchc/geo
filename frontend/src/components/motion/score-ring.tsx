'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

export function ScoreRing({
  value,
  label,
  size = 104,
  className,
  valueTestId,
}: {
  value: number;
  label: string;
  size?: number;
  className?: string;
  valueTestId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (reduced) {
      element.style.setProperty('--ring-p', String(clamped));
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
        { '--ring-p': 0 },
        {
          '--ring-p': clamped,
          duration: 1.15,
          ease: 'power3.out',
          delay: 0.15,
          onComplete: () => element.style.setProperty('--ring-p', String(clamped)),
        },
      );

      stop = () => tween.kill();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [clamped, reduced]);

  const style = {
    width: size,
    height: size,
    '--ring-p': 0,
    background:
      'conic-gradient(from -90deg, var(--ring-color) calc(var(--ring-p) * 1%), var(--ring-track) 0)',
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn(
        'relative mx-auto mt-1 grid place-items-center rounded-full shadow-[0_12px_30px_-18px_rgba(79,70,229,0.55)]',
        className,
      )}
      style={style}
    >
      <div
        className="relative z-[1] grid place-items-center rounded-full bg-card shadow-[inset_0_0_0_1px_rgba(18,20,26,0.03)]"
        style={{ width: size - 22, height: size - 22 }}
      >
        <div className="text-center">
          <b
            data-testid={valueTestId}
            className="tnum block text-[26px] leading-none font-semibold"
          >
            {Math.round(clamped)}
          </b>
          <small className="mt-1 block text-2xs text-faint">{label}</small>
        </div>
      </div>
    </div>
  );
}
