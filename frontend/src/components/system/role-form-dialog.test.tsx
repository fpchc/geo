import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { Role } from '@/lib/api/roles-client';
import zhCN from '@/messages/zh-CN.json';
import { server } from '@/test/msw/server';
import { RoleFormDialog } from './role-form-dialog';

const rowRole: Role = {
  id: 3,
  code: 'content_ops',
  name: 'Row Role',
  description: null,
  menu_ids: [],
};

function renderDialog(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function dialog() {
  return (
    <RoleFormDialog
      open
      role={rowRole}
      existingRoles={[]}
      onOpenChange={() => undefined}
      onSaved={() => undefined}
    />
  );
}

describe('RoleFormDialog', () => {
  it('loads the latest role when opened', async () => {
    server.use(
      http.get('/api/bff/system/roles/3', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: { ...rowRole, name: 'Fresh Role' },
        }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByDisplayValue('Fresh Role')).toBeInTheDocument();
  });

  it('falls back to the row data and warns when the refresh fails', async () => {
    server.use(
      http.get('/api/bff/system/roles/3', () =>
        HttpResponse.json({ code: 50000, message: 'boom' }, { status: 500 }),
      ),
    );

    renderDialog(dialog());

    expect(await screen.findByText('无法获取最新数据，当前显示列表中的信息。')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Row Role')).toBeInTheDocument();
  });
});
