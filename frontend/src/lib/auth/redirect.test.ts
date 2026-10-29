import { describe, expect, it } from 'vitest';
import { safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it('keeps a relative dashboard path', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
  });

  it('keeps relative query and hash state', () => {
    expect(safeNextPath('/dashboard?tab=content#top')).toBe('/dashboard?tab=content#top');
  });

  it('falls back when the value is missing', () => {
    expect(safeNextPath(undefined)).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });

  it('rejects absolute URLs', () => {
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
  });

  it('rejects control characters that normalize into another origin', () => {
    expect(safeNextPath('/\t/evil.example')).toBe('/dashboard');
  });

  it('rejects backslashes', () => {
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
  });

  it('rejects repeated query values', () => {
    expect(safeNextPath(['/a', '/b'])).toBe('/dashboard');
  });

  it('does not redirect back to login', () => {
    expect(safeNextPath('/login')).toBe('/dashboard');
  });
});
