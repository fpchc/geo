import { describe, expect, it } from 'vitest';
import { webVitalSchema } from './vitals';

describe('webVitalSchema', () => {
  it('accepts a standard metric', () => {
    expect(
      webVitalSchema.parse({
        id: 'v3-123',
        name: 'LCP',
        value: 1234.5,
        rating: 'good',
        navigationType: 'navigate',
      }),
    ).toMatchObject({ name: 'LCP', value: 1234.5 });
  });

  it('rejects non-numeric values', () => {
    expect(webVitalSchema.safeParse({ id: 'x', name: 'LCP', value: 'slow' }).success).toBe(false);
  });

  it('rejects missing ids', () => {
    expect(webVitalSchema.safeParse({ name: 'CLS', value: 0.1 }).success).toBe(false);
  });
});
