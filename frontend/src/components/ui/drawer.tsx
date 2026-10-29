'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function subscribe() {
  return () => {};
}

export function Drawer({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('Common');
  const reduced = useReducedMotion();
  const titleId = useId();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef<string | null>(null);
  const previousOpenRef = useRef(false);
  const generation = useRef(0);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChangeRef.current(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    generation.current += 1;
    const currentGeneration = generation.current;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (open) {
      if (document.activeElement instanceof HTMLElement) {
        restoreRef.current = document.activeElement;
      }

      if (previousOverflowRef.current === null) {
        previousOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';

      const focusFrame = window.requestAnimationFrame(() => panel?.focus());

      if (reduced) {
        if (panel) {
          panel.style.transform = 'translateX(0)';
          panel.style.opacity = '1';
        }
        if (overlay) {
          overlay.style.opacity = '1';
        }
      } else {
        void import('motion').then(({ animate }) => {
          if (generation.current !== currentGeneration) {
            return;
          }
          if (panel) {
            animate(panel, { x: ['100%', '0%'] }, { type: 'spring', stiffness: 300, damping: 32 });
          }
          if (overlay) {
            animate(overlay, { opacity: [0, 1] }, { duration: 0.25 });
          }
        });
      }

      return () => window.cancelAnimationFrame(focusFrame);
    }

    if (!wasOpen) {
      return;
    }

    const finish = () => {
      if (generation.current !== currentGeneration) {
        return;
      }
      restoreRef.current?.focus();
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
    };

    if (reduced) {
      if (panel) {
        panel.style.transform = 'translateX(100%)';
      }
      if (overlay) {
        overlay.style.opacity = '0';
      }
      finish();
      return;
    }

    void import('motion').then(({ animate }) => {
      if (generation.current !== currentGeneration) {
        return;
      }
      if (panel) {
        animate(panel, { x: '100%' }, { duration: 0.3, ease: [0.4, 0, 1, 1] });
      }
      if (overlay) {
        animate(overlay, { opacity: 0 }, { duration: 0.2, onComplete: finish });
      } else {
        window.setTimeout(finish, 220);
      }
    });
  }, [open, reduced]);

  useEffect(() => {
    return () => {
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
      }
    };
  }, []);

  function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') {
      return;
    }

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-overlay backdrop-blur-[2px]',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        style={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-hidden={!open}
        inert={!open}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        className={cn(
          'fixed top-0 right-0 z-50 flex h-dvh w-[500px] max-w-[92vw] flex-col border-l border-border bg-card shadow-pop outline-none',
          className,
        )}
        style={{ transform: 'translateX(100%)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-[18px] pb-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="truncate text-[13px] text-muted-foreground">{eyebrow}</p>
            ) : null}
            <h2
              id={titleId}
              className="mt-0.5 mb-0 text-[17px] font-semibold tracking-[-0.01em] break-words"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 mb-0 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-[9px] text-faint transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('close')}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-7">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-4">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}
