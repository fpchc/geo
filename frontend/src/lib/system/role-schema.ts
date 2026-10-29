import { z } from 'zod';
import type { Role } from '@/lib/api/roles-client';

export const roleCodePattern = /^[a-z][a-z0-9_]*$/;

const defaultMessages: Record<string, string> = {
  'validation.codePattern': 'code 只能包含小写字母、数字和下划线，且以字母开头',
  'validation.codeRequired': '请输入角色 code',
  'validation.descriptionMax': '描述不能超过 500 个字符',
  'validation.nameRequired': '请输入角色名称',
};

function defaultTranslator(key: string): string {
  return defaultMessages[key] ?? key;
}

export function buildRoleSchema(t: (key: string) => string) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t('validation.codeRequired'))
      .max(64)
      .regex(roleCodePattern, t('validation.codePattern')),
    name: z.string().trim().min(1, t('validation.nameRequired')).max(100),
    description: z.string().max(500, t('validation.descriptionMax')),
  });
}

export const roleSchema = buildRoleSchema(defaultTranslator);

export type RoleValues = z.infer<typeof roleSchema>;

export function isDuplicateRoleCode(code: string, roles: Role[], excludeId?: number): boolean {
  const normalized = code.trim().toLowerCase();

  return roles.some((role) => role.id !== excludeId && role.code.toLowerCase() === normalized);
}
