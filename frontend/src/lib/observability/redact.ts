const SENSITIVE_KEY = /authorization|cookie|password|secret|token|prompt|material/i;

export function redactValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return '[Filtered]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

export function redactSentryEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const record = event as Record<string, unknown>;
  const request = record.request;

  if (request && typeof request === 'object') {
    const requestRecord = request as Record<string, unknown>;
    const headers = requestRecord.headers;

    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (SENSITIVE_KEY.test(key)) {
          (headers as Record<string, unknown>)[key] =
            typeof value === 'string' ? '[Filtered]' : value;
        }
      }
    }

    if (requestRecord.data) {
      requestRecord.data = redactValue(requestRecord.data);
    }

    if (requestRecord.cookies) {
      requestRecord.cookies = '[Filtered]';
    }
  }

  if (record.extra) {
    record.extra = redactValue(record.extra);
  }

  return event;
}
