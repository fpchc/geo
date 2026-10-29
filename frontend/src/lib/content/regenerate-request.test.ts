import { describe, expect, it } from 'vitest';
import { requestFromContentDetail } from './regenerate-request';

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    agent_id: 2,
    user_id: 1,
    status: 'generated',
    regen_count: 0,
    current_version_id: 1,
    params: {
      params: {
        audience: 'developers',
        platform: 'blog',
        industry: 'software',
        angle: 'practical',
      },
      keywords: ['alpha', 'beta'],
      target_word_count: 1200,
      extra_prompt: 'Keep it short.',
      material_ids: [7, 9],
    },
    ...overrides,
  };
}

describe('requestFromContentDetail', () => {
  it('rebuilds a generate request from the stored snapshot', () => {
    expect(requestFromContentDetail(detail() as never)).toEqual({
      agent_id: 2,
      params: {
        audience: 'developers',
        platform: 'blog',
        industry: 'software',
        angle: 'practical',
      },
      keywords: ['alpha', 'beta'],
      target_word_count: 1200,
      extra_prompt: 'Keep it short.',
      material_ids: [7, 9],
    });
  });

  it('returns null without an agent or keywords', () => {
    expect(requestFromContentDetail(detail({ agent_id: null }) as never)).toBeNull();
    expect(
      requestFromContentDetail(detail({ params: { ...detail().params, keywords: [] } }) as never),
    ).toBeNull();
  });
});
