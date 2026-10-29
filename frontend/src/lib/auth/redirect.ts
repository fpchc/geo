const INTERNAL_ORIGIN = 'http://internal.local';

function hasUnsafeCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code < 0x20 || code === 0x7f || char === '\\') {
      return true;
    }
  }

  return false;
}

export function safeNextPath(value: string | string[] | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) {
    return '/dashboard';
  }

  // Reject control characters and backslashes before URL normalization can
  // reinterpret them as a different origin.
  if (hasUnsafeCharacters(value)) {
    return '/dashboard';
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN);

    if (url.origin !== INTERNAL_ORIGIN) {
      return '/dashboard';
    }

    if (!url.pathname.startsWith('/') || url.pathname.startsWith('//')) {
      return '/dashboard';
    }

    if (url.pathname === '/login') {
      return '/dashboard';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}
