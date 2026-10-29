'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { RecentContent } from '@/components/dashboard/recent-content';
import { StatusDistribution } from '@/components/dashboard/status-distribution';
import { PageHeader } from '@/components/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BffError } from '@/lib/api/bff-client';
import { getAgents, getContents } from '@/lib/api/content-client';
import {
  dashboardRange,
  type DashboardFilters as Filters,
  getDashboardOverview,
  getDashboardTrends,
} from '@/lib/api/dashboard-client';

type Period = '14' | '30' | '90';

function isNotReady(error: unknown): boolean {
  return (
    error instanceof BffError &&
    (error.status === 0 || error.status === 404 || error.status === 501 || error.status === 502)
  );
}

function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useTranslations('DashboardMetrics');
  const notReady = isNotReady(error);

  return (
    <Alert variant={notReady ? 'default' : 'destructive'}>
      <AlertTitle>{notReady ? t('notReadyTitle') : t('errorTitle')}</AlertTitle>
      <AlertDescription>
        <p>
          {notReady ? t('notReadyHint') : error instanceof Error ? error.message : t('errorHint')}
        </p>
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Skeleton className="col-span-12 h-[330px] min-[1100px]:col-span-8" />
      <div className="col-span-12 grid grid-cols-2 gap-4 min-[1100px]:col-span-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[157px] w-full" />
        ))}
      </div>
      <Skeleton className="col-span-12 h-[350px] min-[1100px]:col-span-4" />
      <Skeleton className="col-span-12 h-[350px] min-[1100px]:col-span-8" />
    </div>
  );
}

export function DashboardView({
  canListAgents,
  canListContents,
}: {
  canListAgents: boolean;
  canListContents: boolean;
}) {
  const t = useTranslations('Dashboard');
  const metricsT = useTranslations('DashboardMetrics');
  const [period, setPeriod] = useState<Period>('14');
  const [agentId, setAgentId] = useState('');
  const days = Number(period);
  const filters = useMemo<Filters>(
    () => ({
      ...dashboardRange(days),
      agentId,
    }),
    [agentId, days],
  );

  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    enabled: canListAgents,
  });

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', filters],
    queryFn: () => getDashboardOverview(filters),
    enabled: Boolean(filters.from && filters.to),
    retry: 1,
  });

  const trendsQuery = useQuery({
    queryKey: ['dashboard-trends', filters],
    queryFn: () => getDashboardTrends(filters),
    enabled: Boolean(filters.from && filters.to),
    retry: 1,
  });

  const contentsQuery = useQuery({
    queryKey: ['dashboard-recent-content', agentId],
    queryFn: () =>
      getContents({
        page: 1,
        page_size: 5,
        agent_id: agentId ? Number(agentId) : undefined,
      }),
    enabled: canListContents && Boolean(agentId === '' || Number.isFinite(Number(agentId))),
    retry: 1,
  });

  const overview = overviewQuery.data;
  const trends = trendsQuery.data;
  const overviewEmpty = overview
    ? overview.kpis.contentCount === 0 && overview.statusDistribution.length === 0
    : false;
  const points = trends?.points ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('description', { days })}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canListAgents ? (
              <div className="w-36">
                <Select
                  aria-label={metricsT('agent')}
                  value={agentId}
                  onChange={(event) => setAgentId(event.target.value)}
                >
                  <option value="">{metricsT('allAgents')}</option>
                  {(agentsQuery.data ?? []).map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <SegmentedControl
              ariaLabel={metricsT('periodLabel')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: '14', label: metricsT('range14') },
                { value: '30', label: metricsT('range30') },
                { value: '90', label: metricsT('range90') },
              ]}
            />
          </div>
        }
      />

      {overviewQuery.isLoading ? (
        <DashboardSkeleton />
      ) : overviewQuery.error ? (
        <DashboardError
          error={overviewQuery.error}
          onRetry={() => {
            void overviewQuery.refetch();
            void trendsQuery.refetch();
          }}
        />
      ) : overview ? (
        <>
          {overviewEmpty ? <EmptyState message={metricsT('empty')} /> : null}

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-3 min-[1100px]:col-span-8">
              <DashboardHero days={days} points={points} total={overview.kpis.contentCount} />
              {trendsQuery.error ? (
                <DashboardError
                  error={trendsQuery.error}
                  onRetry={() => void trendsQuery.refetch()}
                />
              ) : null}
            </div>

            <div className="col-span-12 min-[1100px]:col-span-4">
              <KpiCards kpis={overview.kpis} points={points} />
            </div>

            <div className="col-span-12 min-[1100px]:col-span-4">
              <StatusDistribution items={overview.statusDistribution} />
            </div>

            <div className="col-span-12 min-[1100px]:col-span-8">
              <RecentContent
                canAccess={canListContents}
                agents={agentsQuery.data ?? []}
                error={contentsQuery.error}
                items={contentsQuery.data?.items ?? []}
                loading={contentsQuery.isLoading}
                onRetry={() => void contentsQuery.refetch()}
              />
            </div>
          </div>

          <p className="text-right text-[11px] text-muted-foreground">
            {metricsT('timezone', { timezone: overview.timezone })}
          </p>
        </>
      ) : null}
    </div>
  );
}
