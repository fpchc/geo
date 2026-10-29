export const CONTENT_STATUS_KEYS = [
  'configuring',
  'generating',
  'generate_failed',
  'generated',
  'reviewed',
  'locked',
  'retained',
] as const;

export type ContentStatusKey = (typeof CONTENT_STATUS_KEYS)[number];

export function isContentStatusKey(value: string): value is ContentStatusKey {
  return (CONTENT_STATUS_KEYS as readonly string[]).includes(value);
}
