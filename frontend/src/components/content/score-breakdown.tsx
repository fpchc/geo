'use client';

import { useTranslations } from 'next-intl';
import { ScoreRing } from '@/components/motion/score-ring';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Score } from '@/lib/api/content-client';

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function ScoreBreakdown({
  score,
  loading,
  error,
  keywords = [],
  onRetry,
}: {
  score: Score | null;
  loading: boolean;
  error: { message: string; title: string } | null;
  keywords?: string[];
  onRetry: () => void;
}) {
  const t = useTranslations('Studio');
  const overall = clampScore(score?.overall_score ?? 0);
  const coverage = score?.dimensions.find((dimension) => /关键词|keyword/i.test(dimension.name));
  const coverageValue = coverage ? clampScore(coverage.score) : null;

  return (
    <>
      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
              {t('reviewRetry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading && !score ? <Skeleton className="mt-4 h-28 w-full" /> : null}

      {score ? (
        <>
          <ScoreRing
            value={overall}
            label={t('scoreOverall')}
            className="mt-1"
            valueTestId="score-overall"
          />
          <span className="mx-auto mt-2.5 block w-fit rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
            {t('scoreGrade')}{' '}
            <b data-testid="score-grade" className="font-medium">
              {score.grade}
            </b>
          </span>

          <div className="mt-4 space-y-3">
            {score.dimensions.length ? (
              score.dimensions.map((dimension) => (
                <div key={dimension.name}>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{dimension.name}</span>
                    <b className="font-medium text-foreground">{dimension.score}</b>
                  </div>
                  <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-foreground/[0.055] shadow-[inset_0_1px_2px_rgba(18,20,26,0.05)]">
                    <i
                      className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-swift"
                      style={{ width: `${clampScore(dimension.score)}%` }}
                    />
                  </div>
                  {dimension.detail ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{dimension.detail}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">{t('scoreEmpty')}</p>
            )}
          </div>

          <div className="mt-[18px] border-t border-border pt-3.5">
            <p className="mb-2 text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {t('keywordCoverage')}
            </p>
            <div className="flex items-baseline gap-2">
              <b className="tnum text-[26px] font-semibold">
                {coverageValue === null ? '—' : `${Math.round(coverageValue)}%`}
              </b>
              <span className="text-[11px] text-muted-foreground">
                {keywords.length} · {t('keywords')}
              </span>
            </div>
            {keywords.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center rounded-full bg-foreground/[0.05] px-2 py-[3px] text-[11px] text-foreground/70"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t('scoreEmpty')}</p>
            )}
          </div>
        </>
      ) : !error && !loading ? (
        <EmptyState message={t('scoreEmpty')} className="mt-4" />
      ) : null}
    </>
  );
}
