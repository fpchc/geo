'use client';

import { useQuery } from '@tanstack/react-query';
import { Ellipsis, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { ContentStatusBadge } from '@/components/content/content-status-badge';
import { LibraryDrawer } from '@/components/content/library-drawer';
import { LibraryPagination } from '@/components/content/library-pagination';
import { PageHeader } from '@/components/page-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BffError } from '@/lib/api/bff-client';
import {
  type ContentRecord,
  getAgents,
  getContentDetail,
  getContentScore,
  getContents,
} from '@/lib/api/content-client';
import {
  LIBRARY_PAGE_SIZE,
  type LibraryFilters,
  toContentListParams,
  toLibrarySearch,
} from '@/lib/content/library-filters';
import { CONTENT_STATUS_KEYS } from '@/lib/content/status';
import { formatDateTime } from '@/lib/format/date-time';

const LOADING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] as const;

function LoadingRows() {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {LOADING_ROW_KEYS.map((key) => (
        <Skeleton key={key} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function LibraryPage({ initialFilters }: { initialFilters: LibraryFilters }) {
  const t = useTranslations('Library');
  const statusT = useTranslations('Studio.status');
  const [filters, setFilters] = useState(initialFilters);
  const [keywordInput, setKeywordInput] = useState(initialFilters.keyword);
  const [selected, setSelected] = useState<ContentRecord | null>(null);

  const selectedId = selected?.id ?? null;

  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: getAgents });
  const contentsQuery = useQuery({
    queryKey: ['contents', filters],
    queryFn: () => getContents(toContentListParams(filters)),
    retry: 1,
  });
  const detailQuery = useQuery({
    queryKey: ['content-detail', selectedId],
    queryFn: () => getContentDetail(selectedId as number),
    enabled: selectedId !== null,
  });
  const scoreQuery = useQuery({
    queryKey: ['content-score', selectedId],
    queryFn: async () => {
      try {
        return await getContentScore(selectedId as number);
      } catch (error) {
        if (error instanceof BffError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: selectedId !== null,
    retry: false,
  });

  const agentNames = useMemo(
    () => new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent.name])),
    [agentsQuery.data],
  );

  useEffect(() => {
    window.history.replaceState(null, '', `/content/library${toLibrarySearch(filters)}`);
  }, [filters]);

  function updateFilters(next: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, page: 1, ...next }));
  }

  function agentLabel(agentId: number | null): string {
    if (!agentId) {
      return '—';
    }

    return agentNames.get(agentId) ?? String(agentId);
  }

  const page = contentsQuery.data;
  const items = page?.items ?? [];
  const totalPages = page?.total_pages ?? 0;
  const scoreError = scoreQuery.error
    ? {
        title: t('detailError'),
        message: scoreQuery.error instanceof Error ? scoreQuery.error.message : t('errorHint'),
      }
    : null;

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={page ? t('descriptionWithTotal', { total: page.total }) : t('description')}
        actions={
          <Button asChild className="max-sm:hidden">
            <Link href="/content/studio">
              <Plus className="size-3.5" aria-hidden="true" />
              {t('newContent')}
            </Link>
          </Button>
        }
      />

      {agentsQuery.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            <p>{t('errorHint')}</p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => void agentsQuery.refetch()}
            >
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="mt-4 overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
          <h2 className="m-0 text-sm font-medium">{t('allContent')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                updateFilters({ keyword: keywordInput.trim() });
              }}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
                  aria-hidden="true"
                />
                <Input
                  aria-label={t('keyword')}
                  value={keywordInput}
                  placeholder={t('keywordPlaceholder')}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  className="w-56 pl-8"
                />
              </div>
            </form>

            <Select
              aria-label={t('status')}
              containerClassName="w-[130px]"
              className="w-full"
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">{t('allStatuses')}</option>
              {CONTENT_STATUS_KEYS.map((status) => (
                <option key={status} value={status}>
                  {statusT(status)}
                </option>
              ))}
            </Select>

            <Select
              aria-label={t('agent')}
              containerClassName="w-[140px]"
              className="w-full"
              value={filters.agentId ?? ''}
              onChange={(event) =>
                updateFilters({
                  agentId: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">{t('allAgents')}</option>
              {(agentsQuery.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {contentsQuery.isLoading ? (
          <LoadingRows />
        ) : contentsQuery.error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>
                <p>
                  {contentsQuery.error instanceof Error
                    ? contentsQuery.error.message
                    : t('errorHint')}
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => void contentsQuery.refetch()}
                >
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Table containerClassName="rounded-none border-0 md:overflow-x-visible">
            <TableHeader className="md:[&_th]:sticky md:[&_th]:top-14 md:[&_th]:z-10 md:[&_th]:bg-muted">
              <tr>
                <TableHead>{t('titleColumn')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('agent')}</TableHead>
                <TableHead>{t('creator')}</TableHead>
                <TableHead className="text-right">{t('regenCount')}</TableHead>
                <TableHead className="text-right">{t('updatedAt')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-t border-border px-3.5 py-12 text-center text-sm text-muted-foreground"
                  >
                    {t('empty')}
                  </td>
                </tr>
              ) : null}
              {items.map((content) => (
                <TableRow
                  key={content.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setSelected(content)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(content);
                    }
                  }}
                >
                  <TableCell>
                    <b className="block max-w-72 truncate font-medium">
                      {content.title ?? `#${content.id}`}
                    </b>
                    <Link
                      href={`/content/library/${content.id}`}
                      className="mt-0.5 inline-flex min-h-8 min-w-8 items-center justify-center px-1 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      #{content.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ContentStatusBadge status={content.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agentLabel(content.agent_id)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {content.username ?? content.user_id}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {content.regen_count}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(content.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      aria-label={t('view')}
                      className="grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(content);
                      }}
                    >
                      <Ellipsis className="size-4" aria-hidden="true" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <LibraryPagination
          page={page?.page ?? filters.page}
          pageSize={LIBRARY_PAGE_SIZE}
          totalPages={totalPages}
          total={page?.total ?? 0}
          onPageChange={(next) => setFilters((current) => ({ ...current, page: next }))}
        />
      </Card>

      <LibraryDrawer
        content={selected}
        detail={detailQuery.data ?? null}
        detailLoading={detailQuery.isLoading}
        detailError={
          detailQuery.error
            ? detailQuery.error instanceof Error
              ? detailQuery.error.message
              : t('detailError')
            : null
        }
        score={scoreQuery.data ?? null}
        scoreLoading={scoreQuery.isLoading}
        scoreError={scoreError}
        agentName={selected ? agentLabel(selected.agent_id) : '—'}
        updatedLabel={selected ? formatDateTime(selected.updated_at) : '—'}
        onClose={() => setSelected(null)}
        onRetryDetail={() => void detailQuery.refetch()}
        onRetryScore={() => void scoreQuery.refetch()}
      />
    </div>
  );
}
