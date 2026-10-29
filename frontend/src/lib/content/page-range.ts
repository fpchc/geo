export function visiblePages(page: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages < 1 || windowSize < 1) {
    return [];
  }

  const size = Math.min(windowSize, totalPages);
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = Math.min(Math.max(current - Math.floor(size / 2), 1), totalPages - size + 1);

  return Array.from({ length: size }, (_, index) => start + index);
}
