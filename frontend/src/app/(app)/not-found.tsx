import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { NotFoundReporter } from '@/components/observability/not-found-reporter';
import { Button } from '@/components/ui/button';

export default async function AppNotFound() {
  const t = await getTranslations('Common');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <NotFoundReporter />
      <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
      <Button asChild variant="outline">
        <Link href="/dashboard">{t('backHome')}</Link>
      </Button>
    </div>
  );
}
