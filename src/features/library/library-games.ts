import libraryDataNotFoundImage from '../../assets/images/library-data-not-found.png';
import { ApiError } from '../../api/http-client';
import { getLibraryGames } from '../../api/minigames-api';
import { ContentFeedback } from '../../components/content-feedback';
import { LibraryCard } from '../../components/library-card';
import { snackbar } from '../../components/snackbar';
import type { ApiGame, LibraryQuery } from '../../types/api';

export const DEFAULT_LIBRARY_QUERY: Readonly<LibraryQuery> = {
  category: 'all',
  sort: 'rating-desc',
  page: 1,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGame(value: unknown): value is ApiGame {
  if (!isRecord(value)) return false;
  const textFields = ['slug', 'name', 'category', 'price', 'shortDescription', 'cardImage'];
  return (
    textFields.every((field) => typeof value[field] === 'string') &&
    typeof value.rating === 'number' &&
    Number.isFinite(value.rating) &&
    typeof value.likesCount === 'number' &&
    Number.isFinite(value.likesCount)
  );
}

function readGames(response: unknown): ApiGame[] {
  if (!isRecord(response) || !Array.isArray(response.data) || !response.data.every(isGame)) {
    throw new TypeError('The server returned an invalid game list.');
  }
  return response.data;
}

export class LibraryGames {
  private readonly feedback: ContentFeedback;
  private requestController: AbortController | undefined;
  private isDestroyed = false;

  public constructor(root: HTMLElement) {
    this.feedback = new ContentFeedback(root);
  }

  public showLoading(): void {
    if (this.isDestroyed) return;
    this.requestController?.abort();
    this.feedback.showLoading('cards', 'Loading games…');
  }

  public clear(): void {
    if (this.isDestroyed) return;
    this.requestController?.abort();
    this.feedback.showContent('');
  }

  public async load(
    query: Readonly<LibraryQuery> = DEFAULT_LIBRARY_QUERY,
    isRetry = false,
  ): Promise<void> {
    if (this.isDestroyed) return;
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;
    // Capture the attempted parameters so Retry repeats that request exactly.
    const attemptedQuery = { ...query };
    const isCurrent = (): boolean =>
      !this.isDestroyed && !controller.signal.aborted && this.requestController === controller;

    this.feedback.showLoading('cards', 'Loading games…');

    try {
      const response = await getLibraryGames(attemptedQuery, controller.signal);
      if (!isCurrent()) return;
      const games = readGames(response);
      if (games.length === 0) {
        this.feedback.showEmpty({
          title: 'Data Not Found',
          message: 'No games are available for this selection.',
          imageSrc: libraryDataNotFoundImage,
        });
      } else {
        this.feedback.showContent(games.map((game) => new LibraryCard(game).render()).join(''));
      }
      if (isRetry) snackbar.show('Game library loaded successfully.', 'success');
    } catch (error) {
      if (!isCurrent()) return;
      const message =
        error instanceof ApiError
          ? error.message
          : 'The server returned unexpected game data. Please try again.';
      this.feedback.showError({
        title: 'Unable to load games',
        message,
        onRetry: () => this.load(attemptedQuery, true),
      });
      snackbar.show('Games could not be loaded. Use Retry to try again.', 'error');
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.requestController?.abort();
    this.feedback.destroy();
  }
}
