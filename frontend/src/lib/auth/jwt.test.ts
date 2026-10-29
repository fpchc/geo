import { describe, expect, it } from 'vitest';
import { getTokenExpiry, isTokenExpired } from './jwt';

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function token(payload: unknown): string {
  return `${base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64Url(
    JSON.stringify(payload),
  )}.stub`;
}

describe('jwt', () => {
  it('reads the exp claim', () => {
    expect(getTokenExpiry(token({ exp: 123 }))).toBe(123);
  });

  it('treats malformed tokens as expired', () => {
    expect(isTokenExpired('not-a-token')).toBe(true);
  });

  it('accepts a token far in the future', () => {
    expect(isTokenExpired(token({ exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });

  it('rejects a token inside the refresh skew window', () => {
    expect(isTokenExpired(token({ exp: Math.floor(Date.now() / 1000) + 10 }), 30)).toBe(true);
  });

  it('rejects a past token', () => {
    expect(isTokenExpired(token({ exp: Math.floor(Date.now() / 1000) - 1 }))).toBe(true);
  });
});
