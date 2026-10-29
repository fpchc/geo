import { describe, expect, it } from 'vitest';
import {
  LIBRARY_PAGE_SIZE,
  parseLibraryFilters,
  toContentListParams,
  toLibrarySearch,
} from './library-filters';

describe('parseLibraryFilters', () => {
  it('parses status, agent, keyword and page', () => {
    expect(
      parseLibraryFilters({ status: 'reviewed', agent: '2', keyword: 'geo', page: '3' }),
    ).toEqual({
      status: 'reviewed',
      agentId: 2,
      keyword: 'geo',
      page: 3,
    });
  });

  it('defaults invalid or missing values', () => {
    expect(parseLibraryFilters({})).toEqual({
      status: '',
      agentId: null,
      keyword: '',
      page: 1,
    });
    expect(parseLibraryFilters({ agent: 'abc', page: '-1' })).toEqual({
      status: '',
      agentId: null,
      keyword: '',
      page: 1,
    });
  });

  it('uses the first repeated query value', () => {
    expect(parseLibraryFilters({ status: ['reviewed', 'generated'], page: ['2', '3'] })).toEqual({
      status: 'reviewed',
      agentId: null,
      keyword: '',
      page: 2,
    });
  });
});

describe('toLibrarySearch', () => {
  it('omits defaults', () => {
    expect(toLibrarySearch({ status: '', agentId: null, keyword: '', page: 1 })).toBe('');
  });

  it('serializes active filters', () => {
    expect(toLibrarySearch({ status: 'reviewed', agentId: 2, keyword: 'geo', page: 3 })).toBe(
      '?status=reviewed&agent=2&keyword=geo&page=3',
    );
  });

  it('round-trips through the parser', () => {
    const filters = { status: 'generated', agentId: 1, keyword: 'content', page: 2 };
    const search = toLibrarySearch(filters);
    const parsed = parseLibraryFilters(Object.fromEntries(new URLSearchParams(search)));

    expect(parsed).toEqual(filters);
  });
});

describe('toContentListParams', () => {
  it('maps filters to backend query params', () => {
    expect(
      toContentListParams({ status: 'reviewed', agentId: 2, keyword: 'geo', page: 3 }),
    ).toEqual({
      status: 'reviewed',
      agent_id: 2,
      keyword: 'geo',
      page: 3,
      page_size: LIBRARY_PAGE_SIZE,
    });
  });

  it('drops empty filters', () => {
    expect(toContentListParams({ status: '', agentId: null, keyword: '', page: 1 })).toEqual({
      status: undefined,
      agent_id: undefined,
      keyword: undefined,
      page: 1,
      page_size: LIBRARY_PAGE_SIZE,
    });
  });
});
