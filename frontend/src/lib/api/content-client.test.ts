import { afterEach, describe, expect, it, vi } from 'vitest';
import { BffError } from './bff-client';
import { type CreationOptions, getCreationOptions } from './content-client';

const options: CreationOptions = {
  audience: ['developers'],
  platform: ['blog'],
  industry: ['software'],
  angle: ['tutorial'],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCreationOptions', () => {
  it('requests creation options through the BFF and unwraps the envelope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ code: 0, message: 'success', data: options }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCreationOptions()).resolves.toEqual(options);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bff/content/contents/creation-options',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('surfaces backend failures as BffError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async () => jsonResponse({ code: 40400, message: 'Not found' }, 404)),
    );

    await expect(getCreationOptions()).rejects.toBeInstanceOf(BffError);
    await expect(getCreationOptions()).rejects.toMatchObject({
      name: 'BffError',
      status: 404,
      code: 40400,
      message: 'Not found',
    });
  });
});
