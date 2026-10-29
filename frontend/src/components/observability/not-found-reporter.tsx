'use client';

import * as Sentry from '@sentry/nextjs';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function NotFoundReporter() {
  const pathname = usePathname();

  useEffect(() => {
    Sentry.captureMessage('navigation.unmatched_path', {
      level: 'warning',
      extra: { pathname },
    });
  }, [pathname]);

  return null;
}
