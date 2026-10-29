import { assertRuntimeEnv } from '@/lib/config/env';
import { redactSentryEvent } from '@/lib/observability/redact';

export async function register() {
  assertRuntimeEnv();

  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return;
  }

  const Sentry = await import('@sentry/nextjs');

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    beforeSend: (event) => redactSentryEvent(event) as typeof event,
  });
}

export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(...args);
}
