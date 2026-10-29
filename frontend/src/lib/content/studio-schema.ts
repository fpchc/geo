import { z } from 'zod';

export const keywordSchema = z.string().trim().min(1).max(100);

const defaultMessages: Record<string, string> = {
  'validation.agentRequired': '请选择智能体',
  'validation.keywordsRequired': '至少添加一个关键词',
};

function defaultTranslator(key: string): string {
  return defaultMessages[key] ?? key;
}

export function createStudioSchema(t: (key: string) => string) {
  return z.object({
    agentId: z.number().int().positive(t('validation.agentRequired')),
    audience: z.string().max(200),
    platform: z.string().max(200),
    industry: z.string().max(200),
    angle: z.string().max(200),
    keywords: z.array(keywordSchema).min(1, t('validation.keywordsRequired')).max(50),
    targetWordCount: z.number().int().min(1).max(100000),
    extraPrompt: z.string().max(4000),
  });
}

export const studioSchema = createStudioSchema(defaultTranslator);

export type StudioValues = z.infer<typeof studioSchema>;

export const defaultStudioValues: StudioValues = {
  agentId: 0,
  audience: '',
  platform: '',
  industry: '',
  angle: '',
  keywords: [],
  targetWordCount: 800,
  extraPrompt: '',
};

export function normalizeKeyword(value: string): string {
  return value.trim();
}

export function addKeyword(keywords: string[], value: string): string[] {
  const keyword = normalizeKeyword(value);

  if (!keyword || keywords.includes(keyword)) {
    return keywords;
  }

  return [...keywords, keyword];
}

export function removeKeyword(keywords: string[], value: string): string[] {
  return keywords.filter((keyword) => keyword !== value);
}
