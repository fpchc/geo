import { describe, expect, it } from 'vitest';
import { toGenerateRequest } from './studio-request';
import { defaultStudioValues } from './studio-schema';

describe('toGenerateRequest', () => {
  it('maps form values and material ids to the API body', () => {
    const request = toGenerateRequest(
      {
        ...defaultStudioValues,
        agentId: 3,
        audience: 'developers',
        platform: 'blog',
        industry: 'software',
        angle: 'practical',
        keywords: ['alpha', 'beta'],
        targetWordCount: 1200,
        extraPrompt: 'Use short paragraphs.',
      },
      [7, 9],
    );

    expect(request).toEqual({
      agent_id: 3,
      params: {
        audience: 'developers',
        platform: 'blog',
        industry: 'software',
        angle: 'practical',
      },
      keywords: ['alpha', 'beta'],
      target_word_count: 1200,
      extra_prompt: 'Use short paragraphs.',
      material_ids: [7, 9],
    });
  });

  it('maps empty optional fields to null', () => {
    const request = toGenerateRequest({
      ...defaultStudioValues,
      agentId: 1,
      keywords: ['alpha'],
    });

    expect(request.params).toEqual({
      audience: null,
      platform: null,
      industry: null,
      angle: null,
    });
    expect(request.extra_prompt).toBeNull();
    expect(request.material_ids).toEqual([]);
  });
});
