import type {
  GameDetailsData,
  GameRecord,
  GameComment,
  GameCommentsResponse,
} from '../../types/api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function isGameRecord(value: unknown): value is GameRecord {
  return (
    isRecord(value) &&
    isCount(value.position) &&
    value.position > 0 &&
    typeof value.playerName === 'string' &&
    isCount(value.score) &&
    isDate(value.achievedAt)
  );
}
function isSpecs(value: unknown): value is GameDetailsData['specs'] {
  return (
    isRecord(value) &&
    [value.genre, value.players, value.duration, value.price].every(
      (field) => typeof field === 'string',
    )
  );
}
function isDetails(value: unknown): value is GameDetailsData {
  return (
    isRecord(value) &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    typeof value.heroImage === 'string' &&
    typeof value.fullDescription === 'string' &&
    typeof value.rating === 'number' &&
    Number.isFinite(value.rating) &&
    isCount(value.likesCount) &&
    typeof value.isLikedByCurrentUser === 'boolean' &&
    isSpecs(value.specs) &&
    Array.isArray(value.topRecords) &&
    value.topRecords.every(isGameRecord)
  );
}
function isComment(value: unknown): value is GameComment {
  return (
    isRecord(value) &&
    typeof value.commentId === 'string' &&
    typeof value.authorName === 'string' &&
    typeof value.text === 'string' &&
    isCount(value.likesCount) &&
    typeof value.isLikedByCurrentUser === 'boolean' &&
    isDate(value.createdAt)
  );
}
export function readGameDetails(response: unknown, slug: string): GameDetailsData | undefined {
  if (!isRecord(response) || !('data' in response)) throw new TypeError('Missing game data.');
  if (response.data === null) return undefined;
  if (!isDetails(response.data) || response.data.slug !== slug)
    throw new TypeError('Invalid game details.');
  return response.data;
}
export function readGameComments(
  response: unknown,
): Pick<GameCommentsResponse, 'data'> & { totalComments: number } {
  if (
    !isRecord(response) ||
    !Array.isArray(response.data) ||
    !response.data.every(isComment) ||
    !isRecord(response.meta) ||
    !isCount(response.meta.totalComments) ||
    response.meta.totalComments < response.data.length
  ) {
    throw new TypeError('Invalid game comments.');
  }
  return { data: response.data, totalComments: response.meta.totalComments };
}
