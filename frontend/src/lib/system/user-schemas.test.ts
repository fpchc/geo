import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  editUserSchema,
  isProtectedUser,
  resetPasswordSchema,
} from './user-schemas';

const validCreate = {
  username: 'qa_user',
  password: 'secret123',
  nickname: 'QA',
  email: 'qa@example.com',
  phone: '',
  is_active: true,
  is_superuser: false,
  role_ids: [3],
};

describe('createUserSchema', () => {
  it('accepts a valid user', () => {
    expect(createUserSchema.safeParse(validCreate).success).toBe(true);
  });

  it('requires a username and a six-character password', () => {
    expect(createUserSchema.safeParse({ ...validCreate, username: '' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...validCreate, password: '123' }).success).toBe(false);
  });

  it('rejects invalid email addresses', () => {
    expect(createUserSchema.safeParse({ ...validCreate, email: 'not-an-email' }).success).toBe(
      false,
    );
  });
});

describe('editUserSchema', () => {
  it('accepts profile edits without username or password', () => {
    expect(
      editUserSchema.safeParse({
        nickname: 'QA',
        email: '',
        phone: '',
        is_active: false,
        is_superuser: false,
      }).success,
    ).toBe(true);
  });
});

describe('resetPasswordSchema', () => {
  it('requires matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        new_password: 'secret123',
        confirm_password: 'secret123',
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        new_password: 'secret123',
        confirm_password: 'other123',
      }).success,
    ).toBe(false);
  });
});

describe('isProtectedUser', () => {
  it('protects the current user and superusers', () => {
    expect(isProtectedUser({ id: 1, is_superuser: false }, 1)).toBe(true);
    expect(isProtectedUser({ id: 2, is_superuser: true }, 1)).toBe(true);
    expect(isProtectedUser({ id: 2, is_superuser: false }, 1)).toBe(false);
  });
});
