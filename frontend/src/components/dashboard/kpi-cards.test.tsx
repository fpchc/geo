import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import zhCN from '@/messages/zh-CN.json';
import { KpiCards } from './kpi-cards';

const points = [
  { date: '2026-10-20', contentCount: 10, failures: 1, regenerations: 0, retained: 1 },
  { date: '2026-10-21', contentCount: 20, failures: 1, regenerations: 0, retained: 2 },
  { date: '2026-10-22', contentCount: 30, failures: 0, regenerations: 0, retained: 3 },
];

function renderCards(averageScore: number | null = 82.4) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <KpiCards
        kpis={{
          contentCount: 42,
          generationSuccessRate: 0.86,
          averageScore,
          keywordCoverageRate: 0.91,
        }}
        points={points}
      />
    </NextIntlClientProvider>,
  );
}

describe('KpiCards', () => {
  it('formats counts, percentages and scores', () => {
    renderCards();

    expect(screen.getByTestId('kpi-content-count')).toHaveTextContent('42');
    expect(screen.getByTestId('kpi-success-rate')).toHaveTextContent('86%');
    expect(screen.getByTestId('kpi-average-score')).toHaveTextContent('82.4');
    expect(screen.getByTestId('kpi-keyword-coverage')).toHaveTextContent('91%');
  });

  it('shows a dash when no score is available', () => {
    renderCards(null);

    expect(screen.getByTestId('kpi-average-score')).toHaveTextContent('—');
  });

  it('renders neutral placeholders when a metric has no series', () => {
    render(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <KpiCards
          kpis={{
            contentCount: 0,
            generationSuccessRate: 0,
            averageScore: null,
            keywordCoverageRate: 0,
          }}
          points={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('kpi-content-count')).toHaveTextContent('0');
    expect(screen.getByTestId('kpi-average-score')).toHaveTextContent('—');
  });
});
