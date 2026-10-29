'use client';

import { useLocale, useTranslations } from 'next-intl';
import { NumberCounter } from '@/components/motion/number-counter';
import { Card } from '@/components/ui/card';
import type { DashboardKpis, DashboardTrendPoint } from '@/lib/api/dashboard-client';
import {
  buildSparkline,
  contentCountSeries,
  seriesDelta,
  successRateSeries,
} from '@/lib/dashboard/metrics';
import { cn } from '@/lib/utils';

function decimalsForPercent(value: number): number {
  return Number.isInteger(value) ? 0 : 1;
}

function Sparkline({
  values,
  tone = 'primary',
}: {
  values: number[];
  tone?: 'primary' | 'neutral';
}) {
  const chart = buildSparkline(values, 96, 28, 2, 4);

  if (!chart) {
    return (
      <svg viewBox="0 0 96 28" className="h-6 w-[70px] text-faint" aria-hidden="true">
        <line
          x1="2"
          y1="16"
          x2="94"
          y2="16"
          stroke="currentColor"
          strokeDasharray="3 6"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 96 28"
      className={cn('h-6 w-[70px]', tone === 'primary' ? 'text-primary' : 'text-faint')}
      aria-hidden="true"
    >
      <path
        d={chart.linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={tone === 'primary' ? 0.42 : 0.7}
      />
    </svg>
  );
}

export function KpiCards({ kpis, points }: { kpis: DashboardKpis; points: DashboardTrendPoint[] }) {
  const t = useTranslations('DashboardMetrics');
  const locale = useLocale();
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  });
  const successPercent = kpis.generationSuccessRate * 100;
  const keywordPercent = kpis.keywordCoverageRate * 100;
  const successSeries = successRateSeries(points);
  const countSeries = contentCountSeries(points);

  const items = [
    {
      id: 'content-count',
      label: t('contentCount'),
      value: kpis.contentCount,
      decimals: 0,
      suffix: '',
      grouped: true,
      delta: seriesDelta(countSeries),
      series: countSeries,
    },
    {
      id: 'success-rate',
      label: t('successRate'),
      value: successPercent,
      decimals: decimalsForPercent(successPercent),
      suffix: '%',
      grouped: false,
      delta: seriesDelta(successSeries),
      series: successSeries,
    },
    {
      id: 'average-score',
      label: t('averageScore'),
      value: kpis.averageScore,
      decimals: 1,
      suffix: '',
      grouped: false,
      delta: null,
      series: [],
    },
    {
      id: 'keyword-coverage',
      label: t('keywordCoverage'),
      value: keywordPercent,
      decimals: decimalsForPercent(keywordPercent),
      suffix: '%',
      grouped: false,
      delta: null,
      series: [],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => {
        const deltaPositive = item.delta !== null && item.delta > 0;
        const deltaNegative = item.delta !== null && item.delta < 0;

        return (
          <Card key={item.id} className="group relative overflow-hidden p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-[34px] -right-[34px] size-[108px] rounded-full [background:radial-gradient(circle,var(--accent),transparent_70%)] transition-opacity duration-300 group-hover:opacity-80"
            />
            <p className="relative z-[1] m-0 text-xs text-muted-foreground">{item.label}</p>
            <p
              data-testid={`kpi-${item.id}`}
              className="relative z-[1] mt-2 mb-0 text-[25px] font-semibold tracking-[-0.02em] tabular-nums"
            >
              {item.value === null ? (
                '—'
              ) : (
                <NumberCounter
                  value={item.value}
                  decimals={item.decimals}
                  suffix={item.suffix}
                  grouped={item.grouped}
                />
              )}
            </p>
            <p
              className={cn(
                'relative z-[1] mt-1 mb-0 text-[11px]',
                deltaPositive && 'text-success',
                deltaNegative && 'text-destructive',
                !deltaPositive && !deltaNegative && 'text-faint',
              )}
            >
              {item.delta === null ? '—' : percent.format(item.delta)}
            </p>
            <div className="absolute right-3.5 bottom-3.5 transition-opacity duration-300 group-hover:opacity-100">
              <Sparkline
                values={item.series}
                tone={item.series.length > 0 ? 'primary' : 'neutral'}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
