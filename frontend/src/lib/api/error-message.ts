import { BffError } from './bff-client';

export function errorCodeKey(error: unknown): string | null {
  if (!(error instanceof BffError)) {
    return null;
  }

  if (error.status === 0 || error.status >= 500) {
    return 'backendUnavailable';
  }

  switch (error.code) {
    case 20001:
    case 20003:
    case 20004:
      return 'unauthorized';
    case 20002:
      return 'forbidden';
    case 30001:
      return 'duplicateRequest';
    case 10003:
      return 'conflict';
    default:
      return null;
  }
}

export function localizeError(
  error: unknown,
  t: (key: string) => string,
  fallback: string,
): string {
  const key = errorCodeKey(error);

  if (key) {
    return t(key);
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
