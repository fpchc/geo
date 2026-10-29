import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentDetail, ContentRecord, Score } from '@/lib/api/content-client';
import zhCN from '@/messages/zh-CN.json';
import { LibraryDrawer } from './library-drawer';

beforeEach(() => {
  // Reduced motion keeps the panels at their final state so jsdom does not depend on frames.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const content: ContentRecord = {
  id: 2,
  title: 'Generated content 2',
  created_at: '2026-10-22T10:00:00.000Z',
  updated_at: '2026-10-22T10:00:00.000Z',
  username: 'content_ops',
  agent_id: 1,
  user_id: 2,
  status: 'reviewed',
  regen_count: 2,
  current_version_id: 21,
  params: { keywords: ['alpha'] },
};

const detail: ContentDetail = {
  ...content,
  current_version: {
    id: 21,
    content_id: 2,
    title: 'Generated content 2',
    body: '# Generated content 2\n\nReviewed fixture body.',
    word_count: 5,
    source_type: 'generated',
  },
};

const score: Score = {
  id: 1,
  content_id: 2,
  version_id: 21,
  overall_score: 85,
  grade: 'A',
  dimensions: [{ name: 'Keyword coverage', score: 90, weight: 0.5, detail: 'All keywords found.' }],
};

function renderDrawer(overrides: Partial<React.ComponentProps<typeof LibraryDrawer>> = {}) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <LibraryDrawer
        content={content}
        detail={detail}
        detailLoading={false}
        detailError={null}
        score={score}
        scoreLoading={false}
        scoreError={null}
        onClose={() => undefined}
        onRetryDetail={() => undefined}
        onRetryScore={() => undefined}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

describe('LibraryDrawer', () => {
  it('opens on the body tab and shows the generated markdown', () => {
    renderDrawer();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Generated content 2' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '正文' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Generated content 2' })).toBeVisible();
  });

  it('switches to the score tab', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: '评分' }));

    expect(screen.getByRole('tab', { name: '评分' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('score-overall')).toHaveTextContent('85');
    expect(screen.getByTestId('score-grade')).toHaveTextContent('A');
    expect(screen.getByText('Keyword coverage')).toBeVisible();
  });

  it('shows the metadata on the info tab', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: '信息' }));

    expect(screen.getByText('内容 ID')).toBeVisible();
    expect(screen.getByText('#2', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText('content_ops')).toBeVisible();
  });

  it('closes through the header button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer({ onClose });

    await user.click(screen.getByRole('button', { name: '关闭' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('returns to the body tab when another content is opened', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDrawer();

    await user.click(screen.getByRole('tab', { name: '评分' }));
    expect(screen.getByRole('tab', { name: '评分' })).toHaveAttribute('aria-selected', 'true');

    rerender(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <LibraryDrawer
          content={{ ...content, id: 3 }}
          detail={{ ...detail, id: 3 }}
          detailLoading={false}
          detailError={null}
          score={score}
          scoreLoading={false}
          scoreError={null}
          onClose={() => undefined}
          onRetryDetail={() => undefined}
          onRetryScore={() => undefined}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('tab', { name: '正文' })).toHaveAttribute('aria-selected', 'true');
  });
});
