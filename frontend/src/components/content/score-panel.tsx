'use client';

import { useTranslations } from 'next-intl';
import { ScoreBreakdown } from '@/components/content/score-breakdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Score } from '@/lib/api/content-client';
import { cn } from '@/lib/utils';

export function ScorePanel({
  canReview,
  ready,
  reviewed,
  score,
  loading,
  error,
  keywords = [],
  onReview,
  onRetry,
  contentPresent = false,
  canRegenerate = false,
  regenerating = false,
  remaining = 0,
  locked = false,
  onRegenerate,
  canRetain = false,
  retaining = false,
  retained = false,
  retainError = null,
  onRetain,
  className,
}: {
  canReview: boolean;
  ready: boolean;
  reviewed: boolean;
  score: Score | null;
  loading: boolean;
  error: { message: string; title: string } | null;
  keywords?: string[];
  onReview: () => void;
  onRetry: () => void;
  contentPresent?: boolean;
  canRegenerate?: boolean;
  regenerating?: boolean;
  remaining?: number;
  locked?: boolean;
  onRegenerate?: () => void;
  canRetain?: boolean;
  retaining?: boolean;
  retained?: boolean;
  retainError?: string | null;
  onRetain?: () => void;
  className?: string;
}) {
  const t = useTranslations('Studio');
  const showReview = canReview && ready;
  const hasActions = showReview || contentPresent || Boolean(retainError);

  const badge =
    !retained && ready && !reviewed ? <Badge variant="warning">{t('reviewPending')}</Badge> : null;

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-medium">{t('reviewTitle')}</h2>
        {badge}
      </div>

      <ScoreBreakdown
        score={score}
        loading={loading}
        error={error}
        keywords={keywords}
        onRetry={onRetry}
      />

      {retained ? (
        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          {t('status.retained')}
        </p>
      ) : hasActions ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {showReview ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={onReview}
            >
              {loading ? t('reviewing') : reviewed ? t('reviewAgain') : t('review')}
            </Button>
          ) : null}

          {contentPresent ? (
            <>
              <Button
                type="button"
                className="w-full"
                disabled={!canRegenerate || regenerating}
                onClick={onRegenerate}
              >
                {regenerating ? t('regenerating') : t('regenerate')}
              </Button>
              <p className="tnum text-center text-[11px] text-muted-foreground">
                {t('remaining', { count: remaining })}
              </p>
              {locked ? <p className="text-xs text-destructive">{t('lockedHint')}</p> : null}
              {canRetain ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={retaining}
                  onClick={onRetain}
                >
                  {retaining ? t('retaining') : t('retain')}
                </Button>
              ) : null}
            </>
          ) : null}

          {retainError ? (
            <p role="alert" className="text-xs text-destructive">
              {retainError}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
