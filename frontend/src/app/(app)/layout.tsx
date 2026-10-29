import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import { AppShellError } from '@/components/app-shell/app-shell-error';
import { SessionRefresh } from '@/components/session-refresh';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { getSession } from '@/lib/auth/session';
import { getMenuTree } from '@/lib/navigation/menu-provider';
import type { MenuNode } from '@/lib/navigation/types';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    const store = await cookies();

    if (store.get(REFRESH_TOKEN_COOKIE)?.value) {
      return <SessionRefresh />;
    }

    redirect('/login?next=/dashboard');
  }

  const t = await getTranslations('Sidebar');

  let menu: MenuNode[] | null = null;

  try {
    menu = await getMenuTree(session, t);
  } catch {
    menu = null;
  }

  if (!menu) {
    return <AppShellError />;
  }

  return (
    <AppShell
      menu={menu}
      user={session}
      homeLabel={t('home')}
      brandTagline={t('brandTagline')}
      menuLabel={t('menuLabel')}
    >
      {children}
    </AppShell>
  );
}
