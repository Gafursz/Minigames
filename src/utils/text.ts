/**
 * English-only labels and date/number formatting for the MiniGames UI.
 */
export type MessageKey = string;
export function t(key: string, values: Record<string, string | number> = {}): string {
  return key.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
/**
 * API-owned strings, including user comments and game descriptions, are shown verbatim.
 */
export function translateKnown(text: string): string {
  return text;
}
export function getLocale(): string {
  return 'en';
}
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en').format(value);
}
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
    timestamp,
  );
}
