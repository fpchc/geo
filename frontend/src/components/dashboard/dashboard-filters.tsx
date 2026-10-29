'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Agent } from '@/lib/api/content-client';
import type { DashboardFilters as DashboardFilterValues } from '@/lib/api/dashboard-client';

const labelClass = 'font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground';

export function DashboardFilters({
  filters,
  agents,
  canListAgents,
  refreshing,
  onChange,
  onRefresh,
}: {
  filters: DashboardFilterValues;
  agents: Agent[];
  canListAgents: boolean;
  refreshing: boolean;
  onChange: (next: DashboardFilterValues) => void;
  onRefresh: () => void;
}) {
  const t = useTranslations('DashboardMetrics');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/90 bg-card/60 p-4 lg:flex-row lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="dashboard-from" className={labelClass}>
          {t('from')}
        </Label>
        <Input
          id="dashboard-from"
          type="date"
          value={filters.from}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dashboard-to" className={labelClass}>
          {t('to')}
        </Label>
        <Input
          id="dashboard-to"
          type="date"
          value={filters.to}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </div>
      {canListAgents ? (
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-agent" className={labelClass}>
            {t('agent')}
          </Label>
          <Select
            id="dashboard-agent"
            value={filters.agentId}
            onChange={(event) => onChange({ ...filters, agentId: event.target.value })}
          >
            <option value="">{t('allAgents')}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lg:ml-auto"
        disabled={refreshing}
        onClick={onRefresh}
      >
        <RefreshCw
          className={refreshing ? 'size-3.5 animate-spin' : 'size-3.5'}
          aria-hidden="true"
        />
        {refreshing ? t('refreshing') : t('refresh')}
      </Button>
    </div>
  );
}
