'use client';

import { Zap } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { DashboardStatusItem } from '@/lib/api/dashboard-client';
import { statusMetrics } from '@/lib/dashboard/metrics';
import { cn } from '@/lib/utils';

const KNOWN_STATUSES = new Set([
  'configuring',
  'generate_failed',
  'generated',
  'generating',
  'locked',
  'retained',
  'reviewed',
]);

const STATUS_COLOR: Record<string, string> = {
  configuring: 'var(--muted-dot)',
  generate_failed: 'var(--destructive)',
  generated: 'var(--chart-5)',
  generating: 'var(--chart-1)',
  locked: 'var(--muted-dot)',
  retained: 'var(--success)',
  reviewed: 'var(--chart-2)',
};

const STATUS_ORDER = [
  'retained',
  'reviewed',
  'locked',
  'generated',
  'configuring',
  'generating',
  'generate_failed',
];

export function StatusDistribution({ items }: { items: DashboardStatusItem[] }) {
  const t = useTranslations('DashboardMetrics');
  const statusT = useTranslations('Studio');
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  const metrics = statusMetrics(items);
  const belowWarning = metrics.failureRate !== null && metrics.failureRate < 0.02;
  const max = Math.max(1, ...items.map((item) => item.count));
  const sorted = [...items].sort((left, right) => {
    const leftIndex = STATUS_ORDER.indexOf(left.status);
    const rightIndex = STATUS_ORDER.indexOf(right.status);
    const leftOrder = leftIndex === -1 ? STATUS_ORDER.length : leftIndex;
    const rightOrder = rightIndex === -1 ? STATUS_ORDER.length : rightIndex;

    return leftOrder - rightOrder;
  });

  function label(status: string): string {
    return KNOWN_STATUSES.has(status) ? statusT(`status.${status}`) : status;
  }

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-sm font-medium">{t('statusTitle')}</h2>
        <Zap className="size-4 text-primary" aria-hidden="true" />
      </div>

      {items.length === 0 ? (
        <EmptyState message={t('empty')} className="mt-4 flex-1 py-6" />
      ) : (
        <>
          <div
            className="mt-3.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            {sorted.map((item, index) => (
              <i
                key={item.status}
                className="h-full origin-left rounded-full opacity-100 [animation:stackIn_0.7s_var(--ease-swift)_backwards]"
                style={{
                  width: `${(item.count / (metrics.total || 1)) * 100}%`,
                  background: STATUS_COLOR[item.status] ?? 'var(--primary)',
                  animationDelay: `${160 + index * 60}ms`,
                }}
              />
            ))}
          </div>

          <div className="mt-3 space-y-3">
            {sorted.map((item, index) => (
              <div
                key={item.status}
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: '74px minmax(0, 1fr) 36px' }}
              >
                <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-foreground/60">
                  <i
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ background: STATUS_COLOR[item.status] ?? 'var(--primary)' }}
                    aria-hidden="true"
                  />
                  {label(item.status)}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.055] shadow-[inset_0_1px_2px_var(--line)]">
                  <i
                    className="block h-full origin-left rounded-full opacity-100 [animation:stackIn_0.95s_var(--ease-swift)_backwards]"
                    style={{
                      width: `${(item.count / max) * 100}%`,
                      background: STATUS_COLOR[item.status] ?? 'var(--primary)',
                      animationDelay: `${220 + index * 70}ms`,
                    }}
                  />
                </span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">
                  {number.format(item.count)}
                </span>
              </div>
            ))}
          </div>

          {metrics.failureRate !== null ? (
            <div
              className={cn(
                'mt-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[11.5px]',
                belowWarning ? 'bg-success/[0.07] text-success' : 'bg-warning/[0.08] text-warning',
              )}
            >
              <i
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  belowWarning ? 'bg-success' : 'bg-warning',
                )}
                aria-hidden="true"
              />
              <p className="m-0">
                {belowWarning
                  ? t('failureBelow', { rate: percent.format(metrics.failureRate ?? 0) })
                  : t('failureAbove', {
                      rate: percent.format(metrics.failureRate ?? 0),
                    })}
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
            <span>{t('retentionRate')}</span>
            <b className="text-sm font-semibold text-foreground tabular-nums">
              {metrics.retentionRate === null ? '—' : percent.format(metrics.retentionRate)}
            </b>
          </div>
        </>
      )}
    </Card>
  );
}
