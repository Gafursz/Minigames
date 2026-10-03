import type {
  CategoriesResponse,
  FeaturedGamesResponse,
  GameCommentsResponse,
  GameDetailsResponse,
  LibraryGamesResponse,
  LibraryQuery,
} from '../types/api';
import type { LeaderboardData } from '../types/leaderboard-player';
import { getJson } from './http-client';

export const LIBRARY_PAGE_SIZE = 6;
export const LATEST_COMMENTS_LIMIT = 3;

function getGamePath(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError('A game slug must contain lowercase words separated by hyphens.');
  }

  return `games/${encodeURIComponent(slug)}`;
}

export function getCategories(signal?: AbortSignal): Promise<CategoriesResponse> {
  return getJson<CategoriesResponse>('categories', { signal });
}

export function getFeaturedGames(signal?: AbortSignal): Promise<FeaturedGamesResponse> {
  return getJson<FeaturedGamesResponse>('games', { query: { featured: 'true' }, signal });
}

export function getLeaderboard(signal?: AbortSignal): Promise<LeaderboardData> {
  return getJson<LeaderboardData>('leaderboard', { signal });
}

export async function getLibraryGames(
  { category, sort, page }: LibraryQuery,
  signal?: AbortSignal,
): Promise<LibraryGamesResponse> {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError('The Library page must be a positive safe integer.');
  }

  return getJson<LibraryGamesResponse>('games', {
    query: { category, sort, page: String(page), limit: String(LIBRARY_PAGE_SIZE) },
    signal,
  });
}

export async function getGameDetails(
  slug: string,
  signal?: AbortSignal,
): Promise<GameDetailsResponse> {
  return getJson<GameDetailsResponse>(getGamePath(slug), { signal });
}

export async function getGameComments(
  slug: string,
  signal?: AbortSignal,
): Promise<GameCommentsResponse> {
  return getJson<GameCommentsResponse>(`${getGamePath(slug)}/comments`, {
    query: { limit: String(LATEST_COMMENTS_LIMIT), sort: 'newest' },
    signal,
  });
}
