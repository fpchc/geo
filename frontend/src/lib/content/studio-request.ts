import type { GenerateRequest } from '@/lib/api/content-client';
import type { StudioValues } from './studio-schema';

export function toGenerateRequest(
  value: StudioValues,
  materialIds: number[] = [],
): GenerateRequest {
  return {
    agent_id: value.agentId,
    params: {
      audience: value.audience || null,
      platform: value.platform || null,
      industry: value.industry || null,
      angle: value.angle || null,
    },
    keywords: value.keywords,
    target_word_count: value.targetWordCount,
    extra_prompt: value.extraPrompt || null,
    material_ids: materialIds,
  };
}
