'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { PageShell } from '@/components/page-shell';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionRefresh() {
  const router = useRouter();
  const t = useTranslations('Dashboard');

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST' });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          router.refresh();
          return;
        }

        router.replace('/login?next=/dashboard');
      } catch {
        if (!cancelled) {
          router.replace('/login?next=/dashboard');
        }
      }
    }

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <PageShell>
      <div className="space-y-4" aria-busy="true">
        <p className="text-sm text-muted-foreground">{t('refreshingSession')}</p>
        <Skeleton className="h-24 w-full" />
      </div>
    </PageShell>
  );
}
