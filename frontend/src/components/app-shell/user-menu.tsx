'use client';

import { ChevronUp, Settings, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { LogoutButton } from '@/components/logout-button';
import { useToast } from '@/components/ui/toast';
import type { SessionUser } from '@/lib/auth/types';
import { cn } from '@/lib/utils';

export function UserMenu({
  user,
  tagline,
  collapsed,
}: {
  user: SessionUser;
  tagline: string;
  collapsed: boolean;
}) {
  const t = useTranslations('Shell');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = user.username.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-200 hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          collapsed && 'justify-center px-0',
          'max-sm:justify-center max-sm:px-0',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('userMenu')}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden="true"
          className="grid size-[30px] shrink-0 place-items-center rounded-full text-[11px] text-white shadow-primary [background:var(--accent-grad)]"
        >
          {initial}
        </span>
        <span className={cn('min-w-0 flex-1', collapsed && 'hidden', 'max-sm:hidden')}>
          <span className="block truncate text-xs font-medium text-foreground">
            {user.username}
          </span>
          <span className="block truncate text-2xs text-muted-foreground">{tagline}</span>
        </span>
        <ChevronUp
          aria-hidden="true"
          className={cn(
            'ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-spring',
            open && 'rotate-180',
            collapsed && 'hidden',
            'max-sm:hidden',
          )}
        />
      </button>

      <div
        role="menu"
        aria-label={t('userMenu')}
        className={cn(
          'absolute z-30 rounded-xl border border-border bg-card p-1.5 shadow-pop transition-[opacity,transform,visibility] duration-200 ease-spring',
          collapsed
            ? 'bottom-0 left-[calc(100%+8px)] w-[190px] origin-bottom-left'
            : 'right-0 bottom-[calc(100%+8px)] left-0 origin-bottom',
          'max-sm:right-auto max-sm:bottom-0 max-sm:left-[calc(100%+8px)] max-sm:w-[190px] max-sm:origin-bottom-left',
          open
            ? 'visible translate-x-0 translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none invisible translate-y-1.5 scale-[0.98] opacity-0',
        )}
      >
        <div className="mb-1 border-b border-border px-2.5 py-2">
          <b className="block truncate text-xs font-medium text-foreground">{user.username}</b>
          <small className="block truncate text-2xs text-muted-foreground">{tagline}</small>
        </div>

        <button
          type="button"
          role="menuitem"
          title={t('notAvailable')}
          onClick={() => toast(t('notAvailable'))}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
        >
          <User aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          {t('profile')}
        </button>
        <button
          type="button"
          role="menuitem"
          title={t('notAvailable')}
          onClick={() => toast(t('notAvailable'))}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
        >
          <Settings aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          {t('account')}
        </button>

        <LocaleSwitcher className="h-auto justify-start border-0 bg-transparent px-2.5 py-2 text-xs font-normal text-foreground hover:bg-muted/60 hover:text-foreground" />

        <LogoutButton
          className="mt-0.5"
          buttonClassName="h-auto justify-start border-0 bg-transparent px-2.5 py-2 text-xs font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      </div>
    </div>
  );
}
