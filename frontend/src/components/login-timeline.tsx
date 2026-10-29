'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const ENTRANCE = { ease: 'power2.out', clearProps: 'opacity,transform' } as const;

export function LoginTimeline({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;

    // Reduced motion renders the final state and never plays the timeline.
    if (!root || reduced) {
      return;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;

    void import('gsap').then(({ gsap }) => {
      if (cancelled) {
        return;
      }

      const q = gsap.utils.selector(root);
      const orbs = q('[data-login="orb"]');
      const points = q('[data-login="point"]');
      const formItems = [...q('[data-login="form"] > *'), ...q('[data-login="form"] form > *')];
      const floats: { kill: () => void }[] = [];

      const timeline = gsap.timeline({
        defaults: ENTRANCE,
        onComplete: () => {
          orbs.forEach((orb, index) => {
            floats.push(
              gsap.to(orb, {
                y: index === 0 ? 18 : -20,
                duration: 9,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
              }),
            );
          });
        },
      });

      timeline
        .fromTo(
          q('[data-login="brand"]'),
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.45 },
          0,
        )
        .fromTo(
          q('[data-login="quote"]'),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55 },
          0.1,
        )
        .fromTo(
          q('[data-login="positioning"]'),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.45 },
          0.2,
        )
        .fromTo(
          points,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
          0.3,
        )
        // The form is the primary mobile action; start it immediately instead
        // of waiting for the desktop art panel timeline.
        .fromTo(
          formItems,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.06 },
          0.05,
        )
        .fromTo(
          orbs,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: 0.8, stagger: 0.15 },
          0,
        );

      stop = () => {
        timeline.kill();
        for (const tween of floats) {
          tween.kill();
        }
      };
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [reduced]);

  return <div ref={rootRef}>{children}</div>;
}
