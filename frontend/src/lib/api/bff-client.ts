interface BffEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export class BffError extends Error {
  readonly status: number;
  readonly code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'BffError';
    this.status = status;
    this.code = code;
  }
}

interface BffOptions {
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  body?: unknown;
  idempotencyKey?: string;
}

export async function bffRequest<T>(path: string, options: BffOptions = {}): Promise<T> {
  const headers = new Headers({ accept: 'application/json' });

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (options.idempotencyKey) {
    headers.set('x-idempotency-key', options.idempotencyKey);
  }

  let response: Response;

  try {
    response = await fetch(`/api/bff/${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch {
    throw new BffError('Network request failed', 0);
  }

  const body = (await response.json().catch(() => null)) as BffEnvelope<T> | T | null;

  if (!response.ok) {
    const envelope = body as BffEnvelope<T> | null;
    throw new BffError(
      envelope?.message ?? `Request failed with status ${response.status}`,
      response.status,
      envelope?.code,
    );
  }

  if (body && typeof body === 'object' && 'code' in body) {
    const envelope = body as BffEnvelope<T>;

    if (typeof envelope.code === 'number' && envelope.code !== 0) {
      throw new BffError(envelope.message ?? 'Request failed', response.status, envelope.code);
    }

    if (typeof envelope.code === 'number') {
      return envelope.data as T;
    }
  }

  return body as T;
}
