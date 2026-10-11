import type { GameSort } from '../types/api.ts';

export type RoutePage = 'home' | 'library' | 'not-found';
export type RouteDialog =
  { kind: 'game'; slug: string } | { kind: 'auth'; mode: 'login' | 'register' };

export interface RouteState {
  page: RoutePage;
  url: URL;
  library: { category: string | undefined; sort: GameSort; page: number };
  dialog: RouteDialog | undefined;
}

export type QueryChanges = Partial<
  Record<'category' | 'sort' | 'page' | 'game' | 'auth', string | number | undefined>
>;

const sorts: readonly GameSort[] = ['rating-desc', 'rating-asc', 'name-asc', 'name-desc'];
const pages = new Map<string, RoutePage>([
  ['/', 'home'],
  ['/home', 'home'],
  ['/home/', 'home'],
  ['/library', 'library'],
  ['/library/', 'library'],
]);

export function normalizeBase(base: string): string {
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\]/.test(base)) {
    throw new TypeError('The router base must be an absolute URL path.');
  }
  return base.endsWith('/') ? base : `${base}/`;
}

export function getAppPath(url: URL, base: string): string | undefined {
  const normalizedBase = normalizeBase(base);
  if (url.pathname === normalizedBase.slice(0, -1)) return '/';
  return url.pathname.startsWith(normalizedBase)
    ? `/${url.pathname.slice(normalizedBase.length)}`
    : undefined;
}

export function pageHref(page: 'home' | 'library', base: string): string {
  return `${normalizeBase(base)}${page === 'library' ? 'library' : ''}`;
}

function readPage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function setSingleParameter(parameters: URLSearchParams, name: string, value?: string): void {
  if (value === undefined || value === '') parameters.delete(name);
  else parameters.set(name, value);
}

function migrateHash(url: URL, base: string): URL {
  const path = getAppPath(url, base);
  if (path !== '/' || !url.hash.startsWith('#/')) return url;

  // Old shared Story 2 links keep their query state during the one-time migration.
  const legacy = new URL(`${normalizeBase(base)}${url.hash.slice(2)}`, url.origin);
  for (const [name, value] of url.searchParams) {
    if (!legacy.searchParams.has(name)) legacy.searchParams.append(name, value);
  }
  return legacy;
}

export function readRoute(input: URL, base: string): RouteState {
  const url = migrateHash(new URL(input.href), base);
  const path = getAppPath(url, base);
  const page = pages.get(path ?? '') ?? 'not-found';

  const parameters = url.searchParams;
  const category = parameters.get('category')?.trim() || undefined;
  const rawSort = parameters.get('sort');
  const sort = sorts.find((value) => value === rawSort) ?? 'rating-desc';
  const currentPage = readPage(parameters.get('page') ?? undefined);
  const auth = parameters.get('auth');
  const game = parameters.get('game')?.trim();
  let dialog: RouteDialog | undefined;

  if (page !== 'not-found') {
    url.pathname = pageHref(page, base);
    if (page === 'library') {
      setSingleParameter(parameters, 'category', category);
      setSingleParameter(parameters, 'sort', sort === 'rating-desc' ? undefined : sort);
      setSingleParameter(parameters, 'page', currentPage === 1 ? undefined : String(currentPage));
    }
    if (auth === 'login' || auth === 'register') {
      dialog = { kind: 'auth', mode: auth };
      setSingleParameter(parameters, 'auth', auth);
      setSingleParameter(parameters, 'game', game);
    } else {
      parameters.delete('auth');
      setSingleParameter(parameters, 'game', game);
      if (game) dialog = { kind: 'game', slug: game };
    }
  }

  return { page, url, library: { category, sort, page: currentPage }, dialog };
}

export function withQuery(url: URL, changes: QueryChanges): URL {
  const next = new URL(url.href);
  for (const [name, value] of Object.entries(changes)) {
    setSingleParameter(next.searchParams, name, value === undefined ? undefined : String(value));
  }
  return next;
}
