import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Material, uploadMaterial } from '@/lib/api/content-client';
import zhCN from '@/messages/zh-CN.json';
import { MaterialUpload } from './material-upload';

vi.mock('@/lib/api/content-client', () => ({
  uploadMaterial: vi.fn(),
}));

const uploadMock = vi.mocked(uploadMaterial);

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 1,
    user_id: 2,
    filename: 'notes.txt',
    file_type: 'txt',
    object_key: 'materials/notes.txt',
    char_count: 5,
    ...overrides,
  };
}

function Harness() {
  const [materials, setMaterials] = useState<Material[]>([]);

  return <MaterialUpload materials={materials} onChange={setMaterials} />;
}

function renderUpload() {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
      <Harness />
    </NextIntlClientProvider>,
  );
}

describe('MaterialUpload', () => {
  beforeEach(() => {
    uploadMock.mockReset();
  });

  it('uploads a valid file and shows its metadata', async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue(material());
    renderUpload();

    await user.upload(
      screen.getByLabelText('参考资料'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText('5 字符')).toBeInTheDocument();
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported formats before uploading', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderUpload();

    await user.upload(
      screen.getByLabelText('参考资料'),
      new File(['x'], 'notes.exe', { type: 'application/octet-stream' }),
    );

    expect(await screen.findByText('不支持的文件格式。')).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects files above 20MB before uploading', async () => {
    const user = userEvent.setup();
    renderUpload();
    const file = new File(['x'], 'big.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 + 1 });

    await user.upload(screen.getByLabelText('参考资料'), file);

    expect(await screen.findByText('文件超过 20MB。')).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('shows upload failures', async () => {
    const user = userEvent.setup();
    uploadMock.mockRejectedValue(new Error('upload failed'));
    renderUpload();

    await user.upload(
      screen.getByLabelText('参考资料'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByText('upload failed')).toBeInTheDocument();
  });

  it('removes an uploaded material', async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue(material());
    renderUpload();

    await user.upload(
      screen.getByLabelText('参考资料'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );
    await screen.findByText('notes.txt');

    await user.click(screen.getByRole('button', { name: '移除 notes.txt' }));

    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
  });
});
