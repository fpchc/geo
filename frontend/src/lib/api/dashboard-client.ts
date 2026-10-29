import { bffRequest } from './bff-client';

export interface DashboardFilters {
  from: string;
  to: string;
  agentId: string;
}

export interface DashboardKpis {
  contentCount: number;
  generationSuccessRate: number;
  averageScore: number | null;
  keywordCoverageRate: number;
}

export interface DashboardStatusItem {
  status: string;
  count: number;
}

export interface DashboardScoreBucket {
  bucket: string;
  count: number;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  statusDistribution: DashboardStatusItem[];
  scoreDistribution: DashboardScoreBucket[];
  keywordCoverage: {
    covered: number;
    total: number;
  };
  timezone: string;
  range: {
    from: string;
    to: string;
  };
}

export interface DashboardTrendPoint {
  date: string;
  contentCount: number;
  failures: number;
  regenerations: number;
  retained: number;
}

export interface DashboardTrends {
  points: DashboardTrendPoint[];
  timezone: string;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dashboardRange(days: number, now = new Date()): { from: string; to: string } {
  const from = new Date(now);
  from.setDate(from.getDate() - Math.max(1, days) + 1);

  return {
    from: formatDate(from),
    to: formatDate(now),
  };
}

export function defaultDashboardRange(now = new Date()): { from: string; to: string } {
  return dashboardRange(14, now);
}

export function toDashboardQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });

  if (filters.agentId) {
    params.set('agent_id', filters.agentId);
  }

  return params.toString();
}

export function getDashboardOverview(filters: DashboardFilters): Promise<DashboardOverview> {
  return bffRequest<DashboardOverview>(`dashboard/overview?${toDashboardQuery(filters)}`);
}

export function getDashboardTrends(filters: DashboardFilters): Promise<DashboardTrends> {
  return bffRequest<DashboardTrends>(`dashboard/trends?${toDashboardQuery(filters)}`);
}
