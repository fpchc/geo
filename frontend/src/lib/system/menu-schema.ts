import { z } from 'zod';
import type { MenuNode } from '@/lib/api/menus-client';

export const permCodePattern = /^[a-z][a-z0-9:_-]*$/;

const defaultMessages: Record<string, string> = {
  'validation.nameRequired': '请输入菜单名称',
  'validation.pathMustStartWithSlash': '路径必须以 / 开头',
  'validation.pathRequiredForMenu': '菜单必须填写路径',
  'validation.permPattern': '权限码格式不正确',
  'validation.permRequiredForButton': '按钮必须填写权限码',
};

function defaultTranslator(key: string): string {
  return defaultMessages[key] ?? key;
}

export function buildMenuSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().trim().min(1, t('validation.nameRequired')).max(100),
      type: z.number().int().min(0).max(2),
      parent_id: z.number().int().min(0),
      path: z.string().trim().max(255),
      icon: z.string().trim().max(100),
      perm_code: z.string().trim().max(200),
      order_no: z.number().int().min(0).max(9999),
      visible: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (value.type === 1 && !value.path) {
        ctx.addIssue({
          code: 'custom',
          path: ['path'],
          message: t('validation.pathRequiredForMenu'),
        });
      }

      if (value.type === 2 && !value.perm_code) {
        ctx.addIssue({
          code: 'custom',
          path: ['perm_code'],
          message: t('validation.permRequiredForButton'),
        });
      }

      if (value.perm_code && !permCodePattern.test(value.perm_code)) {
        ctx.addIssue({
          code: 'custom',
          path: ['perm_code'],
          message: t('validation.permPattern'),
        });
      }

      if (value.path && !value.path.startsWith('/')) {
        ctx.addIssue({
          code: 'custom',
          path: ['path'],
          message: t('validation.pathMustStartWithSlash'),
        });
      }
    });
}

export const menuSchema = buildMenuSchema(defaultTranslator);

export type MenuValues = z.infer<typeof menuSchema>;

export const defaultMenuValues: MenuValues = {
  name: '',
  type: 1,
  parent_id: 0,
  path: '',
  icon: '',
  perm_code: '',
  order_no: 0,
  visible: true,
};

export interface MenuOption {
  id: number;
  name: string;
  depth: number;
}

export function flattenMenuOptions(nodes: MenuNode[], depth = 0): MenuOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenMenuOptions(node.children ?? [], depth + 1),
  ]);
}

export function isDescendant(tree: MenuNode[], ancestorId: number, nodeId: number): boolean {
  const find = (nodes: MenuNode[]): MenuNode | undefined => {
    for (const node of nodes) {
      if (node.id === ancestorId) {
        return node;
      }

      const child = find(node.children ?? []);

      if (child) {
        return child;
      }
    }

    return undefined;
  };

  const ancestor = find(tree);

  if (!ancestor) {
    return false;
  }

  const contains = (nodes: MenuNode[]): boolean =>
    nodes.some((node) => node.id === nodeId || contains(node.children ?? []));

  return contains(ancestor.children ?? []);
}
