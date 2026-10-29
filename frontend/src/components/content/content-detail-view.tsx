'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ContentStatusBadge } from '@/components/content/content-status-badge';
import { MarkdownPreview } from '@/components/content/markdown-preview';
import { ScorePanel } from '@/components/content/score-panel';
import { VersionList } from '@/components/content/version-list';
import { PageHeader } from '@/components/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BffError } from '@/lib/api/bff-client';
import { getContentDetail, getContentScore, getContentVersions } from '@/lib/api/content-client';

export function ContentDetailView({ contentId }: { contentId: number }) {
  const t = useTranslations('Library');
  const studioT = useTranslations('Studio');

  const detailQuery = useQuery({
    queryKey: ['content-detail', contentId],
    queryFn: () => getContentDetail(contentId),
    retry: 1,
  });
  const versionsQuery = useQuery({
    queryKey: ['content-versions', contentId],
    queryFn: () => getContentVersions(contentId),
    retry: 1,
  });
  const scoreQuery = useQuery({
    queryKey: ['content-score', contentId],
    queryFn: async () => {
      try {
        return await getContentScore(contentId);
      } catch (error) {
        if (error instanceof BffError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    retry: 1,
  });

  const detail = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('detailTitle', { id: contentId })} />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detailQuery.error || !detail) {
    const notFound = detailQuery.error instanceof BffError && detailQuery.error.status === 404;

    return (
      <div className="space-y-6">
        <PageHeader
          title={t('detailTitle', { id: contentId })}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/content/library">{t('back')}</Link>
            </Button>
          }
        />
        <Alert variant="destructive">
          <AlertTitle>{notFound ? t('notFound') : t('detailError')}</AlertTitle>
          <AlertDescription>
            {!notFound && detailQuery.error instanceof Error ? (
              <p>{detailQuery.error.message}</p>
            ) : null}
            {!notFound ? (
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={() => void detailQuery.refetch()}
              >
                {t('retry')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentVersion = detail.current_version;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('detailTitle', { id: detail.id })}
        description={t('detailDescription')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/content/library">{t('back')}</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <ContentStatusBadge status={detail.status} />
        <span className="text-muted-foreground">
          {t('agent')}:{' '}
          <span className="font-mono tabular-nums text-foreground">{detail.agent_id ?? '—'}</span>
        </span>
        <span className="text-muted-foreground">
          {t('user')}:{' '}
          <span className="font-mono tabular-nums text-foreground">{detail.user_id}</span>
        </span>
        <span className="text-muted-foreground">
          {t('regenCount')}:{' '}
          <span className="font-mono tabular-nums text-foreground">{detail.regen_count}</span>
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('currentVersion')}
            {currentVersion ? ` · ${t('versionLabel', { id: currentVersion.id })}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentVersion ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('wordCount', { count: currentVersion.word_count })}
              </p>
              <MarkdownPreview markdown={currentVersion.body} />
            </div>
          ) : (
            <EmptyState message={t('noVersions')} className="py-6" />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('versions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {versionsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : versionsQuery.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t('versionsError')}</AlertTitle>
                <AlertDescription>
                  <p>
                    {versionsQuery.error instanceof Error
                      ? versionsQuery.error.message
                      : t('errorHint')}
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => void versionsQuery.refetch()}
                  >
                    {t('retry')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <VersionList
                versions={versionsQuery.data ?? []}
                currentVersionId={detail.current_version_id}
              />
            )}
          </CardContent>
        </Card>

        <ScorePanel
          canReview={false}
          ready={false}
          reviewed
          score={scoreQuery.data ?? null}
          loading={scoreQuery.isLoading}
          error={
            scoreQuery.error
              ? {
                  title: studioT('scoreLoadError'),
                  message:
                    scoreQuery.error instanceof Error
                      ? scoreQuery.error.message
                      : studioT('scoreLoadError'),
                }
              : null
          }
          onReview={() => undefined}
          onRetry={() => void scoreQuery.refetch()}
        />
      </div>
    </div>
  );
}
