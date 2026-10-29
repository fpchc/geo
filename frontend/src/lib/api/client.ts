import 'server-only';
import { API_BASE_URL } from './config';

type QueryScalar = string | number | boolean;

export type QueryParams = Record<string, QueryScalar | null | undefined | readonly QueryScalar[]>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: QueryParams;
  json?: unknown;
  body?: BodyInit | null;
}

interface ApiErrorOptions {
  status: number;
  code?: number;
  message: string;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly details?: unknown;

  constructor({ status, code, message, details, cause }: ApiErrorOptions) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBizResponse(value: unknown): value is { code: number; message: string; data: unknown } {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    typeof value.message === 'string' &&
    'data' in value
  );
}

function buildUrl(path: string, query: QueryParams | undefined): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function parseJson(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, status: number): string {
  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (isRecord(body)) {
    if (typeof body.message === 'string') {
      return body.message;
    }

    if (typeof body.detail === 'string') {
      return body.detail;
    }

    if (Array.isArray(body.detail)) {
      const messages = body.detail.flatMap((item) =>
        isRecord(item) && typeof item.msg === 'string' ? [item.msg] : [],
      );

      if (messages.length > 0) {
        return messages.join('; ');
      }
    }
  }

  return `Request failed with status ${status}`;
}

function extractCode(body: unknown): number | undefined {
  return isRecord(body) && typeof body.code === 'number' ? body.code : undefined;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  return parseJson(text);
}

function toApiError(status: number, body: unknown): ApiError {
  return new ApiError({
    status,
    code: extractCode(body),
    message: extractMessage(body, status),
    details: body,
  });
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, json, headers, body: rawBody, ...init } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  let body = rawBody;

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      body,
      headers: requestHeaders,
      cache: init.cache ?? 'no-store',
    });
  } catch (error) {
    throw new ApiError({
      status: 0,
      message: error instanceof Error ? error.message : 'Network request failed',
      cause: error,
    });
  }

  const parsed = await parseResponse(response);

  if (!response.ok) {
    throw toApiError(response.status, parsed);
  }

  if (isBizResponse(parsed)) {
    if (parsed.code !== 0) {
      throw new ApiError({
        status: response.status,
        code: parsed.code,
        message: parsed.message,
        details: parsed.data,
      });
    }

    return parsed.data as T;
  }

  return parsed as T;
}
