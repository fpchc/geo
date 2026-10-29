import type { ContentDetail, GenerateRequest } from '@/lib/api/content-client';

const DEFAULT_WORD_COUNT = 800;

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function requestFromContentDetail(detail: ContentDetail): GenerateRequest | null {
  const snapshot = (detail.params ?? {}) as Record<string, unknown>;
  const params =
    snapshot.params && typeof snapshot.params === 'object'
      ? (snapshot.params as Record<string, unknown>)
      : {};
  const keywords = Array.isArray(snapshot.keywords)
    ? snapshot.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : [];
  const agentId = detail.agent_id;

  if (!agentId || keywords.length === 0) {
    return null;
  }

  return {
    agent_id: agentId,
    params: {
      audience: optionalString(params.audience),
      platform: optionalString(params.platform),
      industry: optionalString(params.industry),
      angle: optionalString(params.angle),
    },
    keywords,
    target_word_count:
      typeof snapshot.target_word_count === 'number'
        ? snapshot.target_word_count
        : DEFAULT_WORD_COUNT,
    extra_prompt: optionalString(snapshot.extra_prompt),
    material_ids: Array.isArray(snapshot.material_ids)
      ? snapshot.material_ids.filter((id): id is number => typeof id === 'number')
      : [],
  };
}
