import { describe, expect, it } from 'vitest';
import {
  buildSparkline,
  contentCountSeries,
  seriesDelta,
  statusMetrics,
  successRateSeries,
} from './metrics';

describe('dashboard metrics', () => {
  const points = [
    { date: '2026-10-20', contentCount: 10, failures: 1, regenerations: 2, retained: 3 },
    { date: '2026-10-21', contentCount: 20, failures: 2, regenerations: 1, retained: 4 },
    { date: '2026-10-22', contentCount: 20, failures: 0, regenerations: 2, retained: 6 },
  ];

  it('computes a relative delta across the two halves of a series', () => {
    expect(seriesDelta([10, 20, 20, 30])).toBe(2 / 3);
    expect(seriesDelta([0, 4])).toBeNull();
    expect(seriesDelta([12])).toBeNull();
  });

  it('derives only real trend series', () => {
    expect(contentCountSeries(points)).toEqual([10, 20, 20]);
    expect(successRateSeries(points)).toEqual([0.9, 0.9, 1]);
  });

  it('builds line and area geometry for the hero chart', () => {
    const chart = buildSparkline([10, 20, 20], 100, 40, 10, 10);

    expect(chart?.points).toHaveLength(3);
    expect(chart?.linePath).toMatch(/^M/);
    expect(chart?.areaPath).toMatch(/Z$/);
    expect(buildSparkline([])).toBeNull();
  });

  it('computes failure and retention rates without inventing values', () => {
    expect(
      statusMetrics([
        { status: 'retained', count: 40 },
        { status: 'generate_failed', count: 10 },
      ]),
    ).toEqual({ failureRate: 0.2, retentionRate: 0.8, total: 50 });

    expect(statusMetrics([])).toEqual({ failureRate: null, retentionRate: null, total: 0 });
  });
});
