'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { type ContentStatusKey, isContentStatusKey } from '@/lib/content/status';

const STATUS_VARIANT: Record<
  ContentStatusKey,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  configuring: 'secondary',
  generating: 'info',
  generate_failed: 'destructive',
  generated: 'secondary',
  reviewed: 'info',
  locked: 'warning',
  retained: 'success',
};

export function ContentStatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations('Studio.status');

  if (!isContentStatusKey(status)) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  );
}
