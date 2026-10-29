import { describe, expect, it } from 'vitest';
import { visiblePages } from './page-range';

describe('visiblePages', () => {
  it('returns every page when the list is shorter than the window', () => {
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
  });

  it('centers the window on the current page', () => {
    expect(visiblePages(5, 10)).toEqual([3, 4, 5, 6, 7]);
  });

  it('clamps the window at the start', () => {
    expect(visiblePages(1, 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamps the window at the end', () => {
    expect(visiblePages(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it('clamps an out-of-range page into the list', () => {
    expect(visiblePages(9, 2)).toEqual([1, 2]);
    expect(visiblePages(0, 2)).toEqual([1, 2]);
  });

  it('returns nothing when there are no pages', () => {
    expect(visiblePages(1, 0)).toEqual([]);
  });
});
