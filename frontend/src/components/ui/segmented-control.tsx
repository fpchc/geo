'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const thumbRef = useRef<HTMLSpanElement>(null);
  const buttonsRef = useRef(new Map<T, HTMLButtonElement>());
  const reduced = useReducedMotion();

  useEffect(() => {
    const button = buttonsRef.current.get(value);
    const thumb = thumbRef.current;

    if (!button || !thumb) {
      return;
    }

    const width = button.offsetWidth;
    const x = button.offsetLeft;

    if (reduced) {
      thumb.style.width = `${width}px`;
      thumb.style.transform = `translateX(${x}px)`;
      return;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;

    void import('motion').then(({ animate }) => {
      if (cancelled) {
        return;
      }

      const controls = animate(
        thumb,
        { width, x },
        { type: 'spring', stiffness: 420, damping: 34 },
      );

      stop = () => controls.stop();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [value, reduced]);

  useEffect(() => {
    function reposition() {
      const button = buttonsRef.current.get(value);
      const thumb = thumbRef.current;

      if (!button || !thumb) {
        return;
      }

      thumb.style.width = `${button.offsetWidth}px`;
      thumb.style.transform = `translateX(${button.offsetLeft}px)`;
    }

    window.addEventListener('resize', reposition);

    return () => window.removeEventListener('resize', reposition);
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];

    if (!next) {
      return;
    }

    onChange(next.value);
    buttonsRef.current.get(next.value)?.focus();
  }

  return (
    <fieldset
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'relative m-0 flex min-w-0 items-center gap-0.5 rounded-xl border border-foreground/5 bg-card p-0.5 text-xs shadow-xs',
        className,
      )}
    >
      <span
        ref={thumbRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(18,20,26,0.1),inset_0_0_0_1px_rgba(79,70,229,0.14)] dark:bg-secondary"
        style={{ width: 0 }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          ref={(node) => {
            if (node) {
              buttonsRef.current.set(option.value, node);
            } else {
              buttonsRef.current.delete(option.value);
            }
          }}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="relative z-[1] min-h-8 rounded-lg px-3 py-1.5 text-muted-foreground transition-colors duration-200 ease-swift hover:bg-foreground/[0.035] hover:text-foreground aria-pressed:font-medium aria-pressed:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
