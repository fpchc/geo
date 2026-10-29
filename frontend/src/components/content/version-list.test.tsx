import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import zhCN from '@/messages/zh-CN.json';
import { VersionList } from './version-list';

const versions = [
  {
    id: 12,
    content_id: 1,
    title: 'Newest',
    body: '# Newest',
    word_count: 100,
    source_type: 'regenerate',
  },
  {
    id: 11,
    content_id: 1,
    title: 'Older',
    body: '# Older',
    word_count: 80,
    source_type: 'generated',
  },
];

describe('VersionList', () => {
  it('marks the current version', () => {
    render(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <VersionList versions={versions} currentVersionId={12} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('current-version-badge')).toBeInTheDocument();
    expect(screen.getByText(/Newest/)).toBeInTheDocument();
    expect(screen.getByText(/Older/)).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <VersionList versions={[]} currentVersionId={null} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('暂无版本。')).toBeInTheDocument();
  });
});
