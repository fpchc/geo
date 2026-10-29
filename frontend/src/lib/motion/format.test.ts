import { describe, expect, it } from 'vitest';
import { formatCount } from './format';

describe('formatCount', () => {
  it('groups thousands by default', () => {
    expect(formatCount(1284)).toBe('1,284');
  });

  it('keeps small values ungrouped', () => {
    expect(formatCount(86)).toBe('86');
  });

  it('respects fixed decimals', () => {
    expect(formatCount(92.4, { decimals: 1 })).toBe('92.4');
    expect(formatCount(78, { decimals: 1 })).toBe('78.0');
  });
});
