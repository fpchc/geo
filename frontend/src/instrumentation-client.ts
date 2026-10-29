import { redactSentryEvent } from '@/lib/observability/redact';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sentryPromise: Promise<typeof import('@sentry/nextjs')> | undefined;

function loadSentry() {
  sentryPromise ??= import('@sentry/nextjs');
  return sentryPromise;
}

if (dsn) {
  void loadSentry().then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend: (event) => redactSentryEvent(event) as typeof event,
    });
  });
}

export function onRouterTransitionStart(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRouterTransitionStart>
) {
  if (!dsn) {
    return;
  }

  void loadSentry().then((Sentry) => Sentry.captureRouterTransitionStart(...args));
}
