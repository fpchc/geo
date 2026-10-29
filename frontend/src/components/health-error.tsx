import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function HealthError({ message, action }: { message: string; action?: ReactNode }) {
  const t = useTranslations('Home.health');

  return (
    <Alert variant="destructive">
      <AlertTitle>{t('errorTitle')}</AlertTitle>
      <AlertDescription>
        <p>{t('errorHint')}</p>
        <p className="mt-2 break-all font-mono text-xs opacity-80">{message}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </AlertDescription>
    </Alert>
  );
}
