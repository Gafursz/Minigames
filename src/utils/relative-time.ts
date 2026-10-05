const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(timestamp: string, now = Date.now()): string {
  const created = Date.parse(timestamp);
  if (!Number.isFinite(created)) return 'Unknown time';
  const elapsed = Math.max(0, now - created);
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  let value: number;
  let unit: string;
  if (elapsed < DAY) {
    value = Math.floor(elapsed / HOUR);
    unit = 'hour';
  } else if (elapsed < WEEK) {
    value = Math.floor(elapsed / DAY);
    unit = 'day';
  } else if (elapsed < 4 * WEEK) {
    value = Math.floor(elapsed / WEEK);
    unit = 'week';
  } else if (elapsed < YEAR) {
    value = Math.min(11, Math.max(1, Math.floor(elapsed / MONTH)));
    unit = 'month';
  } else {
    value = Math.floor(elapsed / YEAR);
    unit = 'year';
  }
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}
