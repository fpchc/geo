'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { DashboardScoreBucket } from '@/lib/api/dashboard-client';

export function ScoreDistribution({ items }: { items: DashboardScoreBucket[] }) {
  const t = useTranslations('DashboardMetrics');
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {t('scoreTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState message={t('empty')} className="py-6" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.bucket} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono tabular-nums">{item.bucket}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {number.format(item.count)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-chart-2"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
