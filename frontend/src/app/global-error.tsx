'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            justifyContent: 'center',
            minHeight: '100dvh',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>页面出错了 / Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              border: '1px solid currentColor',
              borderRadius: '0.375rem',
              padding: '0.5rem 1rem',
            }}
          >
            重试 / Retry
          </button>
        </main>
      </body>
    </html>
  );
}
