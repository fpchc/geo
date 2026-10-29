'use client';

import { Bell, PanelLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Brand } from '@/components/brand-mark';
import { RouteTransition } from '@/components/motion/route-transition';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { SessionUser } from '@/lib/auth/types';
import type { MenuNode } from '@/lib/navigation/types';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './breadcrumbs';
import { SidebarNav } from './sidebar-nav';
import { UserMenu } from './user-menu';

export function AppShell({
  menu,
  user,
  homeLabel,
  brandTagline,
  menuLabel,
  children,
}: {
  menu: MenuNode[];
  user: SessionUser;
  homeLabel: string;
  brandTagline: string;
  menuLabel: string;
  children: ReactNode;
}) {
  const t = useTranslations('Shell');
  const tCommon = useTranslations('Common');
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const initial = user.username.slice(0, 1).toUpperCase();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'sticky top-0 z-30 flex h-dvh shrink-0 flex-col overflow-visible border-r border-border bg-[var(--sidebar-bg)] backdrop-blur-[18px] transition-[width] duration-[180ms]',
          collapsed ? 'w-16' : 'w-[212px]',
          'max-sm:w-16',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 p-4',
            collapsed && 'justify-center px-0',
            'max-sm:justify-center max-sm:px-0',
          )}
        >
          <Brand
            href="/dashboard"
            tagline={brandTagline}
            iconOnly={collapsed}
            className={cn('[&>span:last-child]:max-sm:hidden', collapsed && 'justify-center')}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <SidebarNav menu={menu} label={menuLabel} collapsed={collapsed} />
        </div>

        <div className="border-t border-border p-2">
          <UserMenu user={user} tagline={brandTagline} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border px-5 backdrop-blur-[12px] transition-[box-shadow,background-color] duration-300 max-[900px]:px-3.5',
            scrolled ? 'bg-[var(--topbar-bg-scrolled)] shadow-topbar' : 'bg-[var(--topbar-bg)]',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground max-sm:hidden"
              aria-label={collapsed ? tCommon('expand') : tCommon('collapse')}
              title={collapsed ? tCommon('expand') : tCommon('collapse')}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </Button>
            <Breadcrumbs menu={menu} homeLabel={homeLabel} />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              title={t('notAvailable')}
              onClick={() => toast(t('notAvailable'))}
              className="hidden h-8 items-center gap-1.5 rounded-[10px] bg-foreground/[0.04] px-2.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.065] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span>{t('searchPlaceholder')}</span>
              <kbd className="ml-6 rounded border border-foreground/10 px-1 font-sans text-2xs text-faint">
                ⌘K
              </kbd>
            </button>

            <ThemeToggle />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
              aria-label={t('notifications')}
              title={t('notAvailable')}
              onClick={() => toast(t('notAvailable'))}
            >
              <Bell className="size-4" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute top-[7px] right-2 size-1.5 rounded-full bg-destructive shadow-[0_0_0_2px_var(--card)]"
              />
            </Button>

            <span
              aria-hidden="true"
              className="grid size-[30px] shrink-0 place-items-center rounded-full text-[11px] text-white shadow-xs [background:var(--accent-grad)]"
            >
              {initial}
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 pt-5 pb-24 max-[900px]:px-3.5 max-[900px]:pt-4 max-[900px]:pb-20">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
