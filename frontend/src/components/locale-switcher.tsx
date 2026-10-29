'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations('Locale');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nextLocale = locale === 'en-US' ? 'zh-CN' : 'en-US';

  function switchLocale() {
    // biome-ignore lint/suspicious/noDocumentCookie: locale is a non-sensitive UI preference.
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('w-full justify-start', className)}
      onClick={switchLocale}
      disabled={pending}
    >
      {t('switchTo')}
    </Button>
  );
}
