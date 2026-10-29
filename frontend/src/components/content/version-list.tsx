'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { ContentVersion } from '@/lib/api/content-client';
import { cn } from '@/lib/utils';

export function VersionList({
  versions,
  currentVersionId,
}: {
  versions: ContentVersion[];
  currentVersionId: number | null;
}) {
  const t = useTranslations('Library');

  if (versions.length === 0) {
    return <EmptyState message={t('noVersions')} />;
  }

  return (
    <ul className="space-y-2">
      {versions.map((version) => (
        <li
          key={version.id}
          className={cn(
            'rounded-md border border-border/80 p-3 text-sm transition-colors',
            version.id === currentVersionId
              ? 'border-l-2 border-l-primary bg-primary/5'
              : 'bg-card/40 hover:bg-accent/20',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                {t('versionLabel', { id: version.id })}
              </span>{' '}
              · {version.title}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                {t('wordCount', { count: version.word_count })}
              </span>
              {version.id === currentVersionId ? (
                <Badge data-testid="current-version-badge">{t('currentVersionBadge')}</Badge>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
