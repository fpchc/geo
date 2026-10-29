import { bffRequest } from './bff-client';
import type { components } from './generated';

export type Setting = components['schemas']['SettingOut'];

export const DEFAULT_PROMPT_KEY = 'content.default_prompt';
export const SCORING_RULE_KEY = 'content.scoring_rule';

export function getSetting(key: string): Promise<Setting> {
  return bffRequest<Setting>(`content/settings/${encodeURIComponent(key)}`);
}

export function updateSetting(
  key: string,
  value: unknown,
  description?: string | null,
): Promise<Setting> {
  return bffRequest<Setting>(`content/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: { value, description },
  });
}
