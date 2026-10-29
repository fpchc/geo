import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import enUS from '@/messages/en-US.json';
import zhCN from '@/messages/zh-CN.json';
import { HealthCard } from './health-card';
import { HealthError } from './health-error';

function renderWithLocale(ui: ReactNode, locale: 'en-US' | 'zh-CN' = 'zh-CN') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'zh-CN' ? zhCN : enUS}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('HealthCard', () => {
  it('shows the healthy state and version', () => {
    renderWithLocale(<HealthCard status="ok" version="1.2.3" />);

    expect(screen.getByText('正常')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
  });

  it('shows the degraded state in English', () => {
    renderWithLocale(<HealthCard status="degraded" version="1.2.3" />, 'en-US');

    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });
});

describe('HealthError', () => {
  it('shows the failure message and an action', () => {
    renderWithLocale(
      <HealthError message="connection refused" action={<button type="button">重试</button>} />,
    );

    expect(screen.getByText('无法读取后端状态')).toBeInTheDocument();
    expect(screen.getByText('connection refused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });
});
