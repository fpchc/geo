'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LogoutButton({
  className,
  buttonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleLogout() {
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        setError(t('logoutError'));
        return;
      }
    } catch {
      setError(t('logoutError'));
      return;
    }

    startTransition(() => {
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        className={cn('w-full justify-start', buttonClassName)}
        onClick={handleLogout}
        disabled={pending}
      >
        {pending ? t('loggingOut') : t('logout')}
      </Button>
      {error ? (
        <p role="alert" className="px-2.5 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
