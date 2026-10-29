import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function ForbiddenPage() {
  const t = await getTranslations('Forbidden');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Button asChild variant="outline">
        <Link href="/dashboard">{t('back')}</Link>
      </Button>
    </div>
  );
}
