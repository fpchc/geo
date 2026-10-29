import { describe, expect, it } from 'vitest';
import { addKeyword, defaultStudioValues, removeKeyword, studioSchema } from './studio-schema';

describe('keyword helpers', () => {
  it('trims and deduplicates keywords', () => {
    expect(addKeyword(['alpha'], '  alpha  ')).toEqual(['alpha']);
    expect(addKeyword(['alpha'], '  beta ')).toEqual(['alpha', 'beta']);
    expect(addKeyword([], '   ')).toEqual([]);
  });

  it('removes a keyword', () => {
    expect(removeKeyword(['alpha', 'beta'], 'alpha')).toEqual(['beta']);
  });
});

describe('studioSchema', () => {
  const valid = {
    ...defaultStudioValues,
    agentId: 1,
    keywords: ['alpha'],
  };

  it('accepts a complete request', () => {
    expect(studioSchema.safeParse(valid).success).toBe(true);
  });

  it('requires an agent', () => {
    expect(studioSchema.safeParse({ ...valid, agentId: 0 }).success).toBe(false);
  });

  it('requires at least one keyword', () => {
    expect(studioSchema.safeParse({ ...valid, keywords: [] }).success).toBe(false);
  });

  it('bounds the target word count', () => {
    expect(studioSchema.safeParse({ ...valid, targetWordCount: 0 }).success).toBe(false);
    expect(studioSchema.safeParse({ ...valid, targetWordCount: 100001 }).success).toBe(false);
  });

  it('bounds the extra prompt', () => {
    expect(studioSchema.safeParse({ ...valid, extraPrompt: 'x'.repeat(4001) }).success).toBe(false);
  });
});
