'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ContentStatusBadge } from '@/components/content/content-status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Agent, ContentRecord } from '@/lib/api/content-client';
import { formatDateTime } from '@/lib/format/date-time';

export function RecentContent({
  canAccess,
  agents,
  error,
  items,
  loading,
  onRetry,
}: {
  canAccess: boolean;
  agents: Agent[];
  error: unknown;
  items: ContentRecord[];
  loading: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('DashboardMetrics');
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-medium">{t('recentTitle')}</h2>
        {canAccess ? (
          <Link
            href="/content/library"
            className="inline-flex min-h-8 items-center gap-0.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('viewAll')}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {!canAccess ? (
        <EmptyState message={t('noContentPermission')} className="mt-4 py-6" />
      ) : loading ? (
        <div className="mt-3 space-y-3" aria-busy="true">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>{t('recentError')}</AlertTitle>
          <AlertDescription>
            <p>{error instanceof Error ? error.message : t('errorHint')}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState message={t('recentEmpty')} className="mt-4 py-6" />
      ) : (
        <ul className="mt-2 list-none p-0">
          {items.slice(0, 5).map((item) => {
            const title = item.title ?? `#${item.id}`;
            const href = `/content/library?keyword=${encodeURIComponent(title)}`;

            return (
              <li key={item.id} className="border-t border-border first:border-t-0">
                <Link
                  href={href}
                  className="flex items-center gap-4 rounded-[10px] px-2 py-3 transition-[background,transform] duration-200 ease-swift hover:translate-x-[3px] hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13px] font-medium">{title}</b>
                    <small className="mt-0.5 block text-[11px] text-muted-foreground">
                      {item.agent_id === null
                        ? '—'
                        : (agentNames.get(item.agent_id) ?? `#${item.agent_id}`)}
                      {' · '}
                      {formatDateTime(item.updated_at)}
                    </small>
                  </div>
                  <ContentStatusBadge status={item.status} />
                  <span
                    className="w-10 shrink-0 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-right text-xs text-muted-foreground tabular-nums"
                    title={t('score')}
                  >
                    —
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
