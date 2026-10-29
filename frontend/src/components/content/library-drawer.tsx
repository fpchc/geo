'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { ContentStatusBadge } from '@/components/content/content-status-badge';
import { MarkdownPreview } from '@/components/content/markdown-preview';
import { ScoreBreakdown } from '@/components/content/score-breakdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { ContentDetail, ContentRecord, Score } from '@/lib/api/content-client';
import { cn } from '@/lib/utils';

const TABS = ['body', 'score', 'info'] as const;
type LibraryTab = (typeof TABS)[number];

const TAB_LABEL: Record<LibraryTab, 'tabBody' | 'tabScore' | 'tabInfo'> = {
  body: 'tabBody',
  score: 'tabScore',
  info: 'tabInfo',
};

export function LibraryDrawer({
  content,
  detail,
  detailLoading,
  detailError,
  score,
  scoreLoading,
  scoreError,
  agentName = '—',
  updatedLabel = '—',
  onClose,
  onRetryDetail,
  onRetryScore,
}: {
  content: ContentRecord | null;
  detail: ContentDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  score: Score | null;
  scoreLoading: boolean;
  scoreError: { message: string; title: string } | null;
  agentName?: string;
  updatedLabel?: string;
  onClose: () => void;
  onRetryDetail: () => void;
  onRetryScore: () => void;
}) {
  const t = useTranslations('Library');
  const reduced = useReducedMotion();
  const baseId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<LibraryTab, HTMLButtonElement>());
  const contentId = content?.id ?? null;
  // Opening another content resets the tab without an effect round-trip.
  const [tabState, setTabState] = useState<{ contentId: number | null; tab: LibraryTab }>({
    contentId,
    tab: 'body',
  });
  const tab = tabState.contentId === contentId ? tabState.tab : 'body';
  const setTab = (next: LibraryTab) => setTabState({ contentId, tab: next });
  const animationKey = `${contentId}:${tab}:${detailLoading}:${scoreLoading}`;

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel || contentId === null || reduced) {
      return;
    }

    // The body tab renders one markdown wrapper, so stagger its blocks instead.
    const roots = Array.from(panel.children);
    const items =
      tab === 'body' && roots[0]?.firstElementChild ? Array.from(roots[0].children) : roots;

    if (items.length === 0) {
      return;
    }

    // Re-run whenever the active panel swaps its contents.
    void animationKey;

    let cancelled = false;
    let stop: (() => void) | undefined;

    void import('motion').then(({ animate, stagger }) => {
      if (cancelled) {
        return;
      }

      const controls = animate(
        items,
        { opacity: [0, 1], y: [10, 0] },
        { delay: stagger(0.05), duration: 0.38, ease: [0.22, 0.61, 0.36, 1] },
      );

      stop = () => controls.stop();
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [contentId, tab, reduced, animationKey]);

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const index = TABS.indexOf(tab);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(index + delta + TABS.length) % TABS.length];

    if (!next) {
      return;
    }

    setTab(next);
    tabRefs.current.get(next)?.focus();
  }

  const title = detail?.title ?? content?.title ?? (content ? `#${content.id}` : '');
  const keywords = Array.isArray(detail?.params?.keywords)
    ? detail.params.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : [];

  return (
    <Drawer
      open={content !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      eyebrow={content ? `#${content.id}` : undefined}
      title={title}
    >
      <div
        role="tablist"
        aria-label={t('drawerTabs')}
        onKeyDown={onTabKeyDown}
        className="-mx-5 -mt-1 mb-4 flex gap-0.5 border-b border-border px-5"
      >
        {TABS.map((entry) => (
          <button
            key={entry}
            ref={(node) => {
              if (node) {
                tabRefs.current.set(entry, node);
              } else {
                tabRefs.current.delete(entry);
              }
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${entry}`}
            aria-selected={tab === entry}
            aria-controls={`${baseId}-panel-${entry}`}
            tabIndex={tab === entry ? 0 : -1}
            onClick={() => setTab(entry)}
            className={cn(
              'relative px-2.5 py-2.5 text-xs text-muted-foreground transition-colors duration-200 ease-swift hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'after:absolute after:-bottom-px after:left-2.5 after:right-2.5 after:h-0.5 after:rounded-[2px] after:bg-primary after:transition-transform after:duration-[250ms] after:ease-swift after:scale-x-0 after:content-[""]',
              'aria-selected:font-medium aria-selected:text-primary aria-selected:after:scale-x-100',
            )}
          >
            {t(TAB_LABEL[entry])}
          </button>
        ))}
      </div>

      <div
        ref={panelRef}
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
      >
        {tab === 'body' ? (
          detailLoading && !detail ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detailError ? (
            <Alert variant="destructive">
              <AlertTitle>{t('detailError')}</AlertTitle>
              <AlertDescription>
                <p>{detailError}</p>
                <Button className="mt-3" variant="outline" size="sm" onClick={onRetryDetail}>
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : detail?.current_version ? (
            <MarkdownPreview markdown={detail.current_version.body} />
          ) : (
            <EmptyState message={t('noVersions')} />
          )
        ) : null}

        {tab === 'score' ? (
          <ScoreBreakdown
            score={score}
            loading={scoreLoading}
            error={scoreError}
            keywords={keywords}
            onRetry={onRetryScore}
          />
        ) : null}

        {tab === 'info' ? (
          <dl className="m-0 grid grid-cols-[92px_minmax(0,1fr)] gap-x-3.5 gap-y-2.5 text-[13px]">
            <dt className="text-muted-foreground">{t('contentId')}</dt>
            <dd className="m-0 font-mono tabular-nums">#{content?.id}</dd>
            <dt className="text-muted-foreground">{t('status')}</dt>
            <dd className="m-0">
              {content ? <ContentStatusBadge status={content.status} /> : '—'}
            </dd>
            <dt className="text-muted-foreground">{t('agent')}</dt>
            <dd className="m-0">{agentName}</dd>
            <dt className="text-muted-foreground">{t('creator')}</dt>
            <dd className="m-0">{content?.username ?? content?.user_id ?? '—'}</dd>
            <dt className="text-muted-foreground">{t('regenCount')}</dt>
            <dd className="m-0 font-mono tabular-nums">{content?.regen_count ?? 0}</dd>
            <dt className="text-muted-foreground">{t('updatedAt')}</dt>
            <dd className="m-0 tabular-nums">{updatedLabel}</dd>
            <dt className="text-muted-foreground">{t('wordCountLabel')}</dt>
            <dd className="m-0 tabular-nums">
              {detail?.current_version
                ? t('wordCount', { count: detail.current_version.word_count })
                : '—'}
            </dd>
          </dl>
        ) : null}
      </div>
    </Drawer>
  );
}
