'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

type ToastItem = {
  id: number;
  text: string;
};

type ToastContextValue = {
  toast: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('Common');
  const reduced = useReducedMotion();
  const [item, setItem] = useState<ToastItem | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const toast = useCallback((text: string) => {
    nextId.current += 1;
    setItem({ id: nextId.current, text });
  }, []);

  const hide = useCallback(
    (id: number) => {
      const element = toastRef.current;

      if (!element || reduced) {
        setItem((current) => (current?.id === id ? null : current));
        return;
      }

      void import('motion').then(({ animate }) => {
        animate(
          element,
          { x: '-50%', y: 12, scale: 0.96, opacity: 0 },
          {
            duration: 0.24,
            ease: [0.4, 0, 1, 1],
            onComplete: () => {
              setItem((current) => (current?.id === id ? null : current));
            },
          },
        );
      });
    },
    [reduced],
  );

  useEffect(() => {
    if (!item) {
      return;
    }

    const element = toastRef.current;

    if (!element) {
      return;
    }

    if (reduced) {
      element.style.opacity = '1';
      element.style.transform = 'translate(-50%, 0) scale(1)';
    } else {
      void import('motion').then(({ animate }) => {
        animate(
          element,
          { x: '-50%', y: [12, 0], scale: [0.96, 1], opacity: [0, 1] },
          { type: 'spring', stiffness: 420, damping: 30 },
        );
      });
    }

    const timer = window.setTimeout(() => hide(item.id), 2200);

    return () => window.clearTimeout(timer);
  }, [item, reduced, hide]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={toastRef}
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed bottom-7 left-1/2 z-[70] flex items-center gap-3 rounded-full bg-foreground px-4 py-2.5 text-xs text-background shadow-pop',
          !item && 'invisible',
        )}
        style={{ opacity: 0, transform: 'translate(-50%, 12px) scale(0.96)' }}
      >
        {item ? <span>{item.text}</span> : null}
        {item ? (
          <button
            type="button"
            className="pointer-events-auto grid size-4 place-items-center rounded-full text-background/60 transition-colors hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/50"
            aria-label={t('close')}
            onClick={() => hide(item.id)}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
