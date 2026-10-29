import { describe, expect, it } from 'vitest';
import {
  dashboardRange,
  defaultDashboardRange,
  formatDate,
  toDashboardQuery,
} from './dashboard-client';

describe('formatDate', () => {
  it('pads months and days', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('dashboard ranges', () => {
  it('returns inclusive ranges for the selected period', () => {
    expect(dashboardRange(14, new Date(2026, 9, 22))).toEqual({
      from: '2026-10-09',
      to: '2026-10-22',
    });
    expect(dashboardRange(30, new Date(2026, 9, 22))).toEqual({
      from: '2026-09-23',
      to: '2026-10-22',
    });
    expect(dashboardRange(90, new Date(2026, 9, 22))).toEqual({
      from: '2026-07-25',
      to: '2026-10-22',
    });
  });

  it('defaults to the fourteen day period', () => {
    expect(defaultDashboardRange(new Date(2026, 9, 22))).toEqual({
      from: '2026-10-09',
      to: '2026-10-22',
    });
  });
});

describe('toDashboardQuery', () => {
  it('maps the date range without an agent filter', () => {
    expect(toDashboardQuery({ from: '2026-10-01', to: '2026-10-07', agentId: '' })).toBe(
      'from=2026-10-01&to=2026-10-07',
    );
  });

  it('includes the agent filter when set', () => {
    expect(toDashboardQuery({ from: '2026-10-01', to: '2026-10-07', agentId: '3' })).toBe(
      'from=2026-10-01&to=2026-10-07&agent_id=3',
    );
  });
});
