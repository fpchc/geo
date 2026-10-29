import { describe, expect, it } from 'vitest';
import { securityHeaders } from './headers';

function values(headers: ReturnType<typeof securityHeaders>): Record<string, string> {
  return Object.fromEntries(headers.map((header) => [header.key, header.value]));
}

describe('securityHeaders', () => {
  it('sets baseline browser protections', () => {
    const headers = values(securityHeaders(false));

    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });

  it('blocks framing and object embedding in the CSP', () => {
    const csp = values(securityHeaders(true))['Content-Security-Policy'];

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('allows dev tooling only outside production', () => {
    const dev = values(securityHeaders(false))['Content-Security-Policy'];
    const prod = values(securityHeaders(true))['Content-Security-Policy'];

    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('ws:');
    expect(prod).not.toContain("'unsafe-eval'");
  });

  it('enables HSTS only in production', () => {
    expect(values(securityHeaders(true))['Strict-Transport-Security']).toContain('max-age=');
    expect(values(securityHeaders(false))['Strict-Transport-Security']).toBeUndefined();
  });
});
