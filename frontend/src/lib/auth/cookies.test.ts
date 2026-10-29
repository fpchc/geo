import { describe, expect, it } from 'vitest';
import { authCookieOptions } from './cookies';

describe('authCookieOptions', () => {
  it('uses httpOnly, lax, root-scoped cookies', () => {
    const options = authCookieOptions(60);

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(60);
  });
});
