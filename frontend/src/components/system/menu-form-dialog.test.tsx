import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { MenuNode } from '@/lib/api/menus-client';
import zhCN from '@/messages/zh-CN.json';
import { server } from '@/test/msw/server';
import { MenuFormDialog } from './menu-form-dialog';

const rowMenu: MenuNode = {
  id: 5,
  name: 'Row Menu',
  type: 1,
  parent_id: 0,
  ancestors: '0',
  path: '/row',
  icon: null,
  perm_code: null,
  order_no: 1,
  visible: true,
};

function renderDialog(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
          {ui}
        </NextIntlClientProvider>
      </QueryClientProvider>,
    ),
  };
}

function dialog() {
  return (
    <MenuFormDialog
      open
      menu={rowMenu}
      parentId={0}
      tree={[rowMenu]}
      onOpenChange={() => undefined}
      onSaved={() => undefined}
    />
  );
}

describe('MenuFormDialog', () => {
  it('loads the latest menu when opened', async () => {
    server.use(
      http.get('/api/bff/system/menus/5', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: { ...rowMenu, name: 'Fresh Menu' },
        }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByDisplayValue('Fresh Menu')).toBeInTheDocument();
  });

  it('falls back to the row data and warns when the refresh fails', async () => {
    server.use(
      http.get('/api/bff/system/menus/5', () =>
        HttpResponse.json({ code: 50000, message: 'boom' }, { status: 500 }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByText('无法获取最新数据，当前显示列表中的信息。')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Row Menu')).toBeInTheDocument();
  });

  it('waits for the latest menu before showing the form', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.get('/api/bff/system/menus/5', async () => {
        await gate;

        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: { ...rowMenu, name: 'Fresh Menu' },
        });
      }),
    );

    renderDialog(dialog());

    expect(screen.queryByLabelText('名称')).not.toBeInTheDocument();

    release?.();

    expect(await screen.findByDisplayValue('Fresh Menu')).toBeInTheDocument();
  });

  it('keeps typed values in create mode', () => {
    renderDialog(
      <MenuFormDialog
        open
        menu={null}
        parentId={0}
        tree={[]}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: 'Typed Menu' },
    });

    expect(screen.getByDisplayValue('Typed Menu')).toBeInTheDocument();
  });
});
