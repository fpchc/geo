import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import zhCN from '@/messages/zh-CN.json';
import { StatusDistribution } from './status-distribution';

function renderDistribution(items: { status: string; count: number }[]) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <StatusDistribution items={items} />
    </NextIntlClientProvider>,
  );
}

describe('StatusDistribution', () => {
  it('renders translated statuses and counts', () => {
    renderDistribution([
      { status: 'generated', count: 18 },
      { status: 'reviewed', count: 12 },
    ]);

    expect(screen.getByText('已生成')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('已评审')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    renderDistribution([]);

    expect(screen.getByText('所选范围内暂无数据。')).toBeInTheDocument();
  });
});
