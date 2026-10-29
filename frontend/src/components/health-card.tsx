import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HealthCard({ status, version }: { status: string; version?: string }) {
  const t = useTranslations('Home.health');
  const healthy = status === 'ok';
  const statusLabel = healthy ? t('ok') : status === 'degraded' ? t('degraded') : t('unknown');

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        <Badge variant={healthy ? 'default' : 'destructive'}>{statusLabel}</Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <dt className="font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
              {t('status')}
            </dt>
            <dd className="font-mono text-sm font-medium">{status}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
              {t('version')}
            </dt>
            <dd className="font-mono text-sm font-medium tabular-nums">{version ?? '—'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
