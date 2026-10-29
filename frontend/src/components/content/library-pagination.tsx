'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { visiblePages } from '@/lib/content/page-range';
import { cn } from '@/lib/utils';

const PAGE_BUTTON =
  'grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-xs text-muted-foreground transition-[background-color,color,transform] duration-200 ease-swift hover:-translate-y-px hover:bg-foreground/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

export function LibraryPagination({
  page,
  totalPages,
  total,
  pageSize = 20,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations('Library');
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span className="tnum">{t('range', { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={PAGE_BUTTON}
          aria-label={t('previous')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </button>
        {visiblePages(page, totalPages).map((entry) => (
          <button
            key={entry}
            type="button"
            aria-label={t('goToPage', { page: entry })}
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onPageChange(entry)}
            className={cn(
              PAGE_BUTTON,
              entry === page &&
                'bg-accent font-medium text-primary shadow-[var(--shadow-page-active)] hover:bg-accent hover:text-primary',
            )}
          >
            {entry}
          </button>
        ))}
        <button
          type="button"
          className={PAGE_BUTTON}
          aria-label={t('next')}
          disabled={totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
