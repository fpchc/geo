import { describe, expect, it } from 'vitest';
import { assertRuntimeEnv } from './env';

describe('assertRuntimeEnv', () => {
  it('allows development without API_BASE_URL', () => {
    expect(() => assertRuntimeEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('requires API_BASE_URL in production', () => {
    expect(() => assertRuntimeEnv({ NODE_ENV: 'production' })).toThrow(
      'API_BASE_URL is required in production',
    );
  });

  it('allows production with API_BASE_URL', () => {
    expect(() =>
      assertRuntimeEnv({
        NODE_ENV: 'production',
        API_BASE_URL: 'https://api.example.com/api/v1',
      }),
    ).not.toThrow();
  });
});
