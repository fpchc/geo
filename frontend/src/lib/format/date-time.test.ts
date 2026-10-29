import { describe, expect, it } from 'vitest';
import { formatDateTime } from './date-time';

describe('formatDateTime', () => {
  it('formats an ISO timestamp as YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime('2026-10-22T10:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('uses local wall-clock time with zero padding', () => {
    expect(formatDateTime(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05 09:07');
  });

  it('renders midnight as 00:00', () => {
    expect(formatDateTime(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05 00:00');
  });

  it('falls back to the raw value when it is not a date', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
