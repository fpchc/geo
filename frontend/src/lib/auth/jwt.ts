interface JwtPayload {
  exp?: unknown;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function getTokenExpiry(token: string): number | null {
  const payload = token.split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const expiry = getTokenExpiry(token);

  if (expiry === null) {
    return true;
  }

  return expiry <= Math.floor(Date.now() / 1000) + skewSeconds;
}
