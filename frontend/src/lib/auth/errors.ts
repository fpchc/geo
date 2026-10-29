import { ApiError } from '@/lib/api/client';

export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || [20001, 20003, 20004].includes(error.code ?? -1))
  );
}
