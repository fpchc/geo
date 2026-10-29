'use client';

import { useTranslations } from 'next-intl';
import { NumberCounter } from '@/components/motion/number-counter';
import { Card } from '@/components/ui/card';
import type { DashboardTrendPoint } from '@/lib/api/dashboard-client';
import { contentCountSeries, seriesDelta } from '@/lib/dashboard/metrics';
import { cn } from '@/lib/utils';
import { TrendChart } from './trend-chart';

export function DashboardHero({
  days,
  points,
  total,
}: {
  days: number;
  points: DashboardTrendPoint[];
  total: number;
}) {
  const t = useTranslations('DashboardMetrics');
  const delta = seriesDelta(contentCountSeries(points));
  const positive = delta !== null && delta >= 0;
  const deltaText =
    delta === null
      ? '—'
      : new Intl.NumberFormat(undefined, {
          style: 'percent',
          maximumFractionDigits: 1,
          signDisplay: 'always',
        }).format(delta);

  return (
    <Card
      className="dashboard-hero relative overflow-hidden p-5"
      style={{ background: 'var(--hero-bg)' }}
    >
      <div
        aria-hidden="true"
        className="hero-orb pointer-events-none absolute -top-[150px] -right-[90px] size-[340px] rounded-full blur-[8px]"
        style={{ background: 'var(--hero-orb)' }}
      />
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage: 'radial-gradient(var(--hero-grid-dot) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(circle at 85% 6%, #000 0%, transparent 44%)',
          WebkitMaskImage: 'radial-gradient(circle at 85% 6%, #000 0%, transparent 44%)',
        }}
      />

      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[13px] text-muted-foreground">{t('generatedInRange', { days })}</p>
          <p
            data-testid="hero-total"
            className="mt-1 mb-0 text-[34px] font-semibold tracking-[-0.03em] tabular-nums"
          >
            <NumberCounter value={total} grouped />
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            delta === null &&
              'bg-foreground/[0.05] text-faint shadow-[inset_0_0_0_1px_var(--border)]',
            positive &&
              'bg-primary/[0.12] text-primary-strong shadow-[inset_0_0_0_1px_var(--accent)] dark:text-accent-foreground',
            delta !== null &&
              !positive &&
              'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
          )}
        >
          {deltaText}
        </span>
      </div>

      <div className="relative z-[1]">
        <TrendChart points={points} ariaLabel={t('trendAria', { days })} />
      </div>
    </Card>
  );
}
