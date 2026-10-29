export const LIBRARY_PAGE_SIZE = 20;

export interface LibraryFilters {
  agentId: number | null;
  keyword: string;
  page: number;
  status: string;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseLibraryFilters(params: {
  agent?: string | string[];
  keyword?: string | string[];
  page?: string | string[];
  status?: string | string[];
}): LibraryFilters {
  const status = firstValue(params.status)?.trim() ?? '';
  const keyword = firstValue(params.keyword)?.trim() ?? '';
  const agentRaw = firstValue(params.agent);
  const agentId = agentRaw && /^\d+$/.test(agentRaw) ? Math.max(1, Number(agentRaw)) : null;
  const pageRaw = firstValue(params.page);
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1;

  return { agentId, keyword, page, status };
}

export function toLibrarySearch(filters: LibraryFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.agentId) {
    params.set('agent', String(filters.agentId));
  }

  if (filters.keyword) {
    params.set('keyword', filters.keyword);
  }

  if (filters.page > 1) {
    params.set('page', String(filters.page));
  }

  const query = params.toString();

  return query ? `?${query}` : '';
}

export function toContentListParams(filters: LibraryFilters) {
  return {
    agent_id: filters.agentId ?? undefined,
    keyword: filters.keyword || undefined,
    page: filters.page,
    page_size: LIBRARY_PAGE_SIZE,
    status: filters.status || undefined,
  };
}
