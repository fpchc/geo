import type { DashboardStatusItem, DashboardTrendPoint } from '@/lib/api/dashboard-client';

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineGeometry {
  areaPath: string;
  height: number;
  linePath: string;
  points: SparklinePoint[];
  width: number;
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function seriesDelta(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length < 2) {
    return null;
  }

  const midpoint = Math.ceil(clean.length / 2);
  const previous = average(clean.slice(0, midpoint));
  const current = average(clean.slice(midpoint));

  if (previous === 0) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}

export function contentCountSeries(points: DashboardTrendPoint[]): number[] {
  return points.map((point) => point.contentCount).filter((value) => Number.isFinite(value));
}

export function successRateSeries(points: DashboardTrendPoint[]): number[] {
  return points
    .filter((point) => point.contentCount > 0)
    .map((point) => (point.contentCount - point.failures) / point.contentCount)
    .filter((value) => Number.isFinite(value));
}

export function buildSparkline(
  values: number[],
  width = 720,
  height = 200,
  padX = 14,
  padY = 18,
): SparklineGeometry | null {
  if (values.length === 0) {
    return null;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const innerWidth = Math.max(1, width - padX * 2);
  const innerHeight = Math.max(1, height - padY * 2);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : padX + (innerWidth * index) / (values.length - 1),
    y: padY + innerHeight - ((value - min) / span) * innerHeight,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const base = height - 8;
  const areaPath =
    first && last
      ? `${linePath} L${last.x.toFixed(1)} ${base.toFixed(1)} L${first.x.toFixed(1)} ${base.toFixed(1)} Z`
      : '';

  return {
    areaPath,
    height,
    linePath,
    points,
    width,
  };
}

export interface StatusMetrics {
  failureRate: number | null;
  retentionRate: number | null;
  total: number;
}

export function statusMetrics(items: DashboardStatusItem[]): StatusMetrics {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.count), 0);

  if (total === 0) {
    return { failureRate: null, retentionRate: null, total: 0 };
  }

  const retained = items.find((item) => item.status === 'retained')?.count ?? 0;
  const failures = items.find((item) => item.status === 'generate_failed')?.count ?? 0;

  return {
    failureRate: failures / total,
    retentionRate: retained / total,
    total,
  };
}
