'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    const payload = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        '/api/monitoring/vitals',
        new Blob([payload], { type: 'application/json' }),
      );
      return;
    }

    void fetch('/api/monitoring/vitals', {
      method: 'POST',
      body: payload,
      keepalive: true,
    });
  });

  return null;
}
