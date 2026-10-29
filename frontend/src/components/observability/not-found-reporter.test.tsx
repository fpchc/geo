import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundReporter } from './not-found-reporter';

const captureMessage = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/missing',
}));

describe('NotFoundReporter', () => {
  it('reports the unmatched path once', () => {
    render(<NotFoundReporter />);

    expect(captureMessage).toHaveBeenCalledWith('navigation.unmatched_path', {
      level: 'warning',
      extra: { pathname: '/missing' },
    });
  });
});
