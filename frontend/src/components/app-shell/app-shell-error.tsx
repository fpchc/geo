'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function AppShellError() {
  const t = useTranslations('Sidebar');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>{t('menuErrorTitle')}</AlertTitle>
        <AlertDescription>
          <p>{t('menuErrorHint')}</p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
