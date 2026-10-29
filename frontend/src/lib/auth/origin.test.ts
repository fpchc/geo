import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './origin';

function request(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/auth/login', {
    headers: { host: 'localhost', ...headers },
  });
}

describe('isSameOrigin', () => {
  it('accepts requests without browser origin headers', () => {
    expect(isSameOrigin(request({}))).toBe(true);
  });

  it('accepts same-origin browser requests', () => {
    expect(isSameOrigin(request({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
  });

  it('rejects cross-site requests', () => {
    expect(isSameOrigin(request({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  it('accepts an origin that matches the request host', () => {
    expect(isSameOrigin(request({ origin: 'http://localhost' }))).toBe(true);
  });

  it('rejects a different origin', () => {
    expect(isSameOrigin(request({ origin: 'http://evil.example' }))).toBe(false);
  });
});
