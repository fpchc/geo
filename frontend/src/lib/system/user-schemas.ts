import { z } from 'zod';

const defaultMessages: Record<string, string> = {
  'validation.emailInvalid': '请输入有效邮箱',
  'validation.passwordMax': '最多 128 位',
  'validation.passwordMin': '密码至少 6 位',
  'validation.passwordMismatch': '两次密码不一致',
  'validation.phoneMax': '最多 30 个字符',
  'validation.textMax': '最多 100 个字符',
  'validation.usernameMax': '最多 50 个字符',
  'validation.usernameRequired': '请输入用户名',
};

function defaultTranslator(key: string): string {
  return defaultMessages[key] ?? key;
}

export function buildCreateUserSchema(t: (key: string) => string) {
  const optionalText = z
    .string()
    .trim()
    .max(100, t('validation.textMax'))
    .optional()
    .or(z.literal(''));
  const optionalEmail = z
    .string()
    .trim()
    .email(t('validation.emailInvalid'))
    .optional()
    .or(z.literal(''));
  const optionalPhone = z
    .string()
    .trim()
    .max(30, t('validation.phoneMax'))
    .optional()
    .or(z.literal(''));

  return z.object({
    username: z
      .string()
      .trim()
      .min(1, t('validation.usernameRequired'))
      .max(50, t('validation.usernameMax')),
    password: z.string().min(6, t('validation.passwordMin')).max(128, t('validation.passwordMax')),
    nickname: optionalText,
    email: optionalEmail,
    phone: optionalPhone,
    is_active: z.boolean(),
    is_superuser: z.boolean(),
    role_ids: z.array(z.number().int().positive()),
  });
}

export function buildEditUserSchema(t: (key: string) => string) {
  return z.object({
    nickname: z.string().trim().max(100, t('validation.textMax')).optional().or(z.literal('')),
    email: z.string().trim().email(t('validation.emailInvalid')).optional().or(z.literal('')),
    phone: z.string().trim().max(30, t('validation.phoneMax')).optional().or(z.literal('')),
    is_active: z.boolean(),
    is_superuser: z.boolean(),
  });
}

export function buildResetPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      new_password: z
        .string()
        .min(6, t('validation.passwordMin'))
        .max(128, t('validation.passwordMax')),
      confirm_password: z.string(),
    })
    .refine((values) => values.new_password === values.confirm_password, {
      message: t('validation.passwordMismatch'),
      path: ['confirm_password'],
    });
}

export const createUserSchema = buildCreateUserSchema(defaultTranslator);
export const editUserSchema = buildEditUserSchema(defaultTranslator);
export const resetPasswordSchema = buildResetPasswordSchema(defaultTranslator);

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type EditUserValues = z.infer<typeof editUserSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function isProtectedUser(
  user: { id: number; is_superuser: boolean },
  currentUserId: number,
): boolean {
  return user.id === currentUserId || user.is_superuser;
}
