import { describe, expect, it } from 'vitest';
import type { Role } from '@/lib/api/roles-client';
import { isDuplicateRoleCode, roleSchema } from './role-schema';

const roles: Role[] = [
  { id: 1, code: 'content_ops', name: 'Content Ops', description: null },
  { id: 2, code: 'viewer', name: 'Viewer', description: null },
];

describe('roleSchema', () => {
  it('accepts a valid role', () => {
    expect(
      roleSchema.safeParse({
        code: 'content_lead',
        name: 'Content Lead',
        description: '',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(roleSchema.safeParse({ code: 'Content', name: 'x', description: '' }).success).toBe(
      false,
    );
    expect(roleSchema.safeParse({ code: '1content', name: 'x', description: '' }).success).toBe(
      false,
    );
    expect(roleSchema.safeParse({ code: 'content-ops', name: 'x', description: '' }).success).toBe(
      false,
    );
  });

  it('requires a name', () => {
    expect(roleSchema.safeParse({ code: 'content_lead', name: '', description: '' }).success).toBe(
      false,
    );
  });
});

describe('isDuplicateRoleCode', () => {
  it('detects duplicates case-insensitively', () => {
    expect(isDuplicateRoleCode('CONTENT_OPS', roles)).toBe(true);
    expect(isDuplicateRoleCode('new_role', roles)).toBe(false);
  });

  it('excludes the edited role', () => {
    expect(isDuplicateRoleCode('content_ops', roles, 1)).toBe(false);
  });
});
