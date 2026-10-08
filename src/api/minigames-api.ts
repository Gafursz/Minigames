import type {
  CategoriesResponse,
  FeaturedGamesResponse,
  GameCommentsResponse,
  GameDetailsResponse,
  LibraryGamesResponse,
  LibraryQuery,
} from '../types/api';
import type { LeaderboardData } from '../types/leaderboard-player';
import { getJson, postJson } from './http-client.ts';

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
  userEmail?: string,
): Promise<GameDetailsResponse> {
  return getJson<GameDetailsResponse>(getGamePath(slug), {
    signal,
    ...(userEmail && { query: { userEmail } }),
  });
}

export async function getGameComments(
  slug: string,
  signal?: AbortSignal,
  userEmail?: string,
): Promise<GameCommentsResponse> {
  return getJson<GameCommentsResponse>(`${getGamePath(slug)}/comments`, {
    query: {
      limit: String(LATEST_COMMENTS_LIMIT),
      sort: 'newest',
      ...(userEmail && { userEmail }),
    },
    signal,
  });
}

export interface FavoriteState {
  isFavorited: boolean;
  likesCount: number;
}

export async function toggleFavorite(
  slug: string,
  userEmail: string,
  signal?: AbortSignal,
): Promise<FavoriteState> {
  if (!userEmail.trim()) throw new TypeError('A favorite requires a user email.');
  const response = await postJson<unknown>(`${getGamePath(slug)}/favorite`, { userEmail }, signal);
  if (typeof response !== 'object' || response === null || !('data' in response))
    throw new TypeError('The server returned invalid favorite data.');
  const data = response.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    !('isFavorited' in data) ||
    typeof data.isFavorited !== 'boolean' ||
    !('likesCount' in data) ||
    typeof data.likesCount !== 'number' ||
    !Number.isSafeInteger(data.likesCount) ||
    data.likesCount < 0
  )
    throw new TypeError('The server returned invalid favorite data.');
  return { isFavorited: data.isFavorited, likesCount: data.likesCount };
}

export async function submitGameComment(
  slug: string,
  userEmail: string,
  authorName: string,
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  if (userEmail.trim().length === 0 || authorName.length < 2 || authorName.length > 30)
    throw new TypeError('Your profile needs a name of 2–30 characters before posting.');
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 500)
    throw new TypeError('Write a comment of 1–500 characters.');
  await postJson<unknown>(
    `${getGamePath(slug)}/comments`,
    {
      userEmail,
      authorName,
      text: trimmed,
    },
    signal,
    201,
  );
}
