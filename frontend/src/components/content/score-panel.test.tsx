import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '@/lib/api/content-client';
import zhCN from '@/messages/zh-CN.json';
import { ScorePanel } from './score-panel';

const score: Score = {
  id: 1,
  content_id: 1,
  version_id: 1,
  overall_score: 85,
  grade: 'A',
  dimensions: [
    {
      name: 'Keyword coverage',
      score: 90,
      weight: 0.5,
      detail: 'All keywords found.',
    },
  ],
};

function renderPanel(overrides: Partial<ComponentProps<typeof ScorePanel>> = {}) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <ScorePanel
        canReview
        ready
        reviewed={false}
        score={null}
        loading={false}
        error={null}
        onReview={() => undefined}
        onRetry={() => undefined}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

describe('ScorePanel', () => {
  it('renders the overall score, grade and dimensions', () => {
    renderPanel({ score });

    expect(screen.getByTestId('score-overall')).toHaveTextContent('85');
    expect(screen.getByTestId('score-grade')).toHaveTextContent('A');
    expect(screen.getByText('Keyword coverage')).toBeInTheDocument();
    expect(screen.getByText('All keywords found.')).toBeInTheDocument();
  });

  it('starts a review when allowed', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn();
    renderPanel({ onReview });

    await user.click(screen.getByRole('button', { name: '评审' }));

    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('hides the review action when not allowed', () => {
    renderPanel({ canReview: false });

    expect(screen.queryByRole('button', { name: '评审' })).not.toBeInTheDocument();
  });

  it('shows a review error with retry and no zero score', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderPanel({
      error: { title: '评审失败，请重试。', message: 'Review service unavailable' },
      onRetry,
    });

    expect(screen.getByText('Review service unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('score-overall')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state before review', () => {
    renderPanel();

    expect(screen.getByText('尚未评审。')).toBeInTheDocument();
  });
});
