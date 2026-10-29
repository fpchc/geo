import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, updateSetting } from '@/lib/api/settings-client';
import zhCN from '@/messages/zh-CN.json';
import { ContentSettingsPage } from './content-settings-page';

vi.mock('@/lib/api/settings-client', () => ({
  DEFAULT_PROMPT_KEY: 'content.default_prompt',
  SCORING_RULE_KEY: 'content.scoring_rule',
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
}));

const getSettingMock = vi.mocked(getSetting);
const updateSettingMock = vi.mocked(updateSetting);

const defaultRule = {
  full_score: 100,
  pass_line: null,
  dimensions: [{ name: 'Keyword coverage', weight: 1, detail: 'detail' }],
};

function renderPage(canUpdate = true) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <ContentSettingsPage canUpdate={canUpdate} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getSettingMock.mockReset();
  updateSettingMock.mockReset();
  getSettingMock.mockImplementation(async (key) => ({
    key,
    value: key === 'content.default_prompt' ? 'Default prompt' : defaultRule,
    description: null,
  }));
  updateSettingMock.mockImplementation(async (key, value) => ({
    key,
    value,
    description: null,
  }));
});

describe('ContentSettingsPage', () => {
  it('loads and saves both settings', async () => {
    const user = userEvent.setup();
    renderPage();

    const prompt = await screen.findByDisplayValue('Default prompt');
    await user.clear(prompt);
    await user.type(prompt, 'New prompt');

    const rule = screen.getByLabelText('评分规则 JSON');
    fireEvent.change(rule, {
      target: {
        value: JSON.stringify(
          {
            full_score: 100,
            pass_line: null,
            dimensions: [{ name: 'Keyword', weight: 1, detail: 'd' }],
          },
          null,
          2,
        ),
      },
    });

    await user.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => expect(updateSettingMock).toHaveBeenCalledTimes(2));
    expect(updateSettingMock).toHaveBeenNthCalledWith(1, 'content.default_prompt', 'New prompt');
    expect(updateSettingMock).toHaveBeenNthCalledWith(
      2,
      'content.scoring_rule',
      expect.objectContaining({ full_score: 100 }),
    );
    expect(await screen.findByText('设置已保存。')).toBeInTheDocument();
  });

  it('rejects invalid scoring rule JSON', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByDisplayValue('Default prompt');
    const rule = screen.getByLabelText('评分规则 JSON');
    fireEvent.change(rule, { target: { value: '{bad' } });

    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('评分规则不是有效的 JSON。')).toBeInTheDocument();
    expect(updateSettingMock).not.toHaveBeenCalled();
  });

  it('shows a save failure', async () => {
    const user = userEvent.setup();
    updateSettingMock.mockRejectedValue(new Error('Setting update failed'));
    renderPage();

    await screen.findByDisplayValue('Default prompt');
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('Setting update failed')).toBeInTheDocument();
  });

  it('renders values read-only without a save action', async () => {
    renderPage(false);

    const prompt = await screen.findByDisplayValue('Default prompt');
    expect(prompt).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '保存设置' })).not.toBeInTheDocument();
    expect(screen.getAllByText('当前角色只有查询权限，设置只读。').length).toBeGreaterThan(0);
  });
});
