export function getPageWindow(current: number, total: number, limit: number): number[] {
  const count = Math.min(total, limit);
  const start = Math.min(Math.max(current - Math.floor(count / 2), 1), total - count + 1);
  return Array.from({ length: count }, (_, index) => start + index);
}
