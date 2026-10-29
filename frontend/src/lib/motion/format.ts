export function formatCount(
  value: number,
  options: { decimals?: number; grouped?: boolean } = {},
): string {
  const decimals = options.decimals ?? 0;
  const grouped = options.grouped ?? Math.abs(value) >= 1000;

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
}
