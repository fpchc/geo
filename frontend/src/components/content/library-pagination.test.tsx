import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import zhCN from '@/messages/zh-CN.json';
import { LibraryPagination } from './library-pagination';

function renderPagination(props: Partial<React.ComponentProps<typeof LibraryPagination>> = {}) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <LibraryPagination
        page={2}
        totalPages={3}
        total={42}
        pageSize={20}
        onPageChange={() => undefined}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe('LibraryPagination', () => {
  it('shows the visible range and the total', () => {
    renderPagination();

    expect(screen.getByText('显示 21–40，共 42 条')).toBeInTheDocument();
  });

  it('marks the current page and jumps to another one', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ onPageChange });

    expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: '第 3 页' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('moves to the previous and next page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ onPageChange });

    await user.click(screen.getByRole('button', { name: '上一页' }));
    await user.click(screen.getByRole('button', { name: '下一页' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables navigation at the boundaries', () => {
    renderPagination({ page: 1 });

    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
  });

  it('shows an empty range before any content loads', () => {
    renderPagination({ page: 1, totalPages: 0, total: 0 });

    expect(screen.getByText('显示 0–0，共 0 条')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });
});
