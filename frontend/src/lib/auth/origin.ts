export function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite === 'same-origin' || fetchSite === 'none') {
    return true;
  }

  if (fetchSite) {
    return false;
  }

  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  const host = request.headers.get('host');

  if (!host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
