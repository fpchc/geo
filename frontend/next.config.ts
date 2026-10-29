import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/lib/security/headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Keep Sentry out of the dev module graph unless it is actually configured.
const hasSentryConfig = Boolean(
  process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
);

export default async function config(phase: string) {
  const nextConfig: NextConfig = {
    output: 'standalone',
    // React Compiler adds startup/compile cost in dev without changing runtime
    // behaviour there; keep it enabled for production builds.
    reactCompiler: phase !== PHASE_DEVELOPMENT_SERVER,
    allowedDevOrigins: ['127.0.0.1'],
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders(process.env.NODE_ENV === 'production'),
        },
      ];
    },
  };

  const base = withNextIntl(nextConfig);

  if (!hasSentryConfig) {
    return base;
  }

  const { withSentryConfig } = await import('@sentry/nextjs/config');

  return withSentryConfig(base, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    telemetry: false,
    tunnelRoute: '/monitoring',
    widenClientFileUpload: false,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
    },
  });
}
