import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { User } from '@/lib/api/users-client';
import zhCN from '@/messages/zh-CN.json';
import { server } from '@/test/msw/server';
import { EditUserDialog } from './edit-user-dialog';

const rowUser: User = {
  id: 7,
  username: 'editor',
  nickname: 'Row Nickname',
  email: null,
  phone: null,
  is_active: true,
  is_superuser: false,
  role_ids: [],
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

function dialog(user: User | null = rowUser) {
  return (
    <EditUserDialog
      open
      onOpenChange={() => undefined}
      user={user}
      currentUserId={1}
      canManageSuperuser
      submitting={false}
      error={null}
      onSubmit={() => undefined}
    />
  );
}

describe('EditUserDialog', () => {
  it('loads the latest user when opened', async () => {
    server.use(
      http.get('/api/bff/system/users/7', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: { ...rowUser, nickname: 'Fresh Nickname' },
        }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByDisplayValue('Fresh Nickname')).toBeInTheDocument();
  });

  it('falls back to the row data and warns when the refresh fails', async () => {
    server.use(
      http.get('/api/bff/system/users/7', () =>
        HttpResponse.json({ code: 50000, message: 'boom' }, { status: 500 }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByText('无法获取最新数据，当前显示列表中的信息。')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Row Nickname')).toBeInTheDocument();
  });

  it('does not fetch when closed', () => {
    renderDialog(
      <EditUserDialog
        open={false}
        onOpenChange={() => undefined}
        user={rowUser}
        currentUserId={1}
        canManageSuperuser
        submitting={false}
        error={null}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.queryByText('无法获取最新数据，当前显示列表中的信息。')).not.toBeInTheDocument();
  });

  it('waits for the latest user before showing the form', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.get('/api/bff/system/users/7', async () => {
        await gate;

        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: { ...rowUser, nickname: 'Fresh Nickname' },
        });
      }),
    );

    renderDialog(dialog());

    expect(screen.queryByLabelText('昵称')).not.toBeInTheDocument();

    release?.();

    expect(await screen.findByDisplayValue('Fresh Nickname')).toBeInTheDocument();
  });
});
