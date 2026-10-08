import type { AuthProfile } from '../../auth/email-auth';
import { FavoriteControl } from './favorite-control';
import closeIcon from '../../assets/icons/close.svg';
import { GameInfo } from '../../components/game-info';
import { GameRecords } from '../../components/game-records';
import { GameComments } from '../../components/game-comments';
import { ContentFeedback } from '../../components/content-feedback';
import { snackbar } from '../../components/snackbar';
import { getGameDetails } from '../../api/minigames-api';
import { ApiError } from '../../api/http-client';
import { getApiGameHeroImage } from '../../utils/game-hero';
import { escapeHtml } from '../../utils/html';
import { readGameDetails } from './game-data';

export class GameDetails {
  private readonly info = new GameInfo();
  private readonly records = new GameRecords();
  private readonly comments: GameComments;
  private isSuspended = false;
  private suspendedFocus: HTMLElement | undefined;
  private profile: AuthProfile | undefined;
  private readonly favorite: FavoriteControl;
  private element: HTMLDialogElement | undefined;
  private feedback: ContentFeedback | undefined;
  private controller: AbortController | undefined;
  private request: AbortController | undefined;
  private returnFocus: HTMLElement | undefined;
  private closeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private isClosing = false;
  private shouldRestoreFocus = true;
  private slug: string | undefined;

  constructor(
    private readonly onOpenChange: (isOpen: boolean) => void,
    private readonly onCloseRequest?: () => void,
    private readonly requireSession?: () => AuthProfile | undefined,
  ) {
    this.comments = new GameComments(requireSession ? () => Boolean(requireSession()) : undefined);
    this.favorite = new FavoriteControl(requireSession);
  }

  private setTitle(text: string): void {
    const title = this.element?.querySelector('#game-details-title');
    if (title) title.textContent = text;
  }

  private showNotFound(): void {
    this.setTitle('Game Not Found');
    this.feedback?.showEmpty({
      title: 'Game Not Found',
      message: 'This game does not exist or is no longer available.',
    });
  }

  private async load(isRetry = false): Promise<void> {
    const slug = this.slug;
    if (!slug || !this.feedback || !this.element?.open || this.isClosing) return;
    this.request?.abort();
    this.comments.destroy();
    this.favorite.destroy();
    const request = new AbortController();
    this.request = request;
    const isCurrent = (): boolean => this.request === request && !request.signal.aborted;
    this.setTitle('Loading game details');
    this.feedback.showLoading('details', 'Loading game details…');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      this.showNotFound();
      return;
    }
    try {
      const requestedEmail = this.profile?.email;
      const response = await getGameDetails(slug, request.signal, requestedEmail);
      if (!isCurrent()) return;
      const game = readGameDetails(response, slug);
      if (!game) {
        this.showNotFound();
        return;
      }
      const hero = getApiGameHeroImage(game.heroImage);
      this.setTitle(game.name);
      this.feedback.showContent(`
          <div class="game-details__hero">
            ${hero ? `<img class="game-details__cover" src="${escapeHtml(hero)}" alt="${escapeHtml(game.name)}" />` : '<div class="game-details__cover game-details__cover--placeholder" role="img" aria-label="Game image unavailable"></div>'}
          </div>
          <div class="game-details__body">
            ${this.info.render(game, Boolean(this.requireSession))}
            ${this.records.render(game.topRecords)}
            ${this.comments.render()}
          </div>`);
      this.comments.bindEvents(this.element, slug);
      this.comments.setAuthenticated(Boolean(this.profile));
      this.favorite.bind(
        this.element,
        slug,
        {
          isFavorited: game.isLikedByCurrentUser,
          likesCount: game.likesCount,
        },
        requestedEmail,
      );
      if (isRetry) snackbar.show('Game details loaded successfully.', 'success');
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.status === 404) {
        this.showNotFound();
        snackbar.show('This game could not be found.', 'error');
        return;
      }
      this.setTitle('Unable to load game');
      this.feedback.showError({
        title: 'Unable to load game',
        message:
          error instanceof ApiError
            ? error.message
            : 'The server returned unexpected game data. Please try again.',
        onRetry: () => this.load(true),
      });
      snackbar.show('Game details could not be loaded. Use Retry to try again.', 'error');
    }
  }

  private requestClose(): void {
    if (this.onCloseRequest) this.onCloseRequest();
    else this.close();
  }

  private finishClose(shouldRestoreFocus = this.shouldRestoreFocus): void {
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.element?.close();
    this.feedback?.destroy();
    this.element?.classList.remove('is-closing');
    this.isClosing = false;
    this.slug = undefined;
    this.isSuspended = false;
    this.suspendedFocus = undefined;
    document.body.classList.remove('has-open-dialog');
    this.onOpenChange(false);
    if (shouldRestoreFocus && this.returnFocus?.isConnected)
      this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = undefined;
  }

  public render(): string {
    return `<dialog class="game-details" id="game-details" aria-labelledby="game-details-title">
      <span class="visually-hidden" id="game-details-title">Game details</span>
      <div class="game-details__content"></div>
      <button class="game-details__close" type="button" aria-label="Close game details" autofocus>
        <img src="${closeIcon}" alt="" />
      </button>
    </dialog>`;
  }

  public bindEvents(): void {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    const dialog = document.querySelector<HTMLDialogElement>('#game-details');
    const content = dialog?.querySelector<HTMLElement>('.game-details__content');
    if (!dialog || !content) return;
    this.element = dialog;
    this.feedback = new ContentFeedback(content);
    dialog.addEventListener(
      'animationend',
      (event) => {
        if (
          event.target === dialog &&
          event.animationName === 'game-details-exit' &&
          this.isClosing
        )
          this.finishClose();
      },
      { signal },
    );
    dialog
      .querySelector('.game-details__close')
      ?.addEventListener('click', () => this.requestClose(), { signal });
    dialog.addEventListener(
      'cancel',
      (event) => {
        event.preventDefault();
        this.requestClose();
      },
      { signal },
    );
    dialog.addEventListener(
      'click',
      (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          this.requestClose();
      },
      { signal },
    );
  }

  public open(slug: string, trigger?: HTMLElement): void {
    if (!this.element) return;
    const isResuming = this.isSuspended && slug === this.slug;
    const shouldLoad = (!this.element.open && !isResuming) || this.isClosing || slug !== this.slug;
    this.isSuspended = false;
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.isClosing = false;
    this.element.classList.remove('is-closing');
    if (trigger) this.returnFocus = trigger;
    this.slug = slug;
    if (!this.element.open) {
      this.element.showModal();
      if (!isResuming) this.element.scrollTop = 0;
      this.element
        .querySelector<HTMLButtonElement>('.game-details__close')
        ?.focus({ preventScroll: true });
      document.body.classList.add('has-open-dialog');
      this.onOpenChange(true);
    }
    if (isResuming && this.suspendedFocus?.isConnected)
      this.suspendedFocus.focus({ preventScroll: true });
    if (shouldLoad) void this.load();
  }

  public suspend(): void {
    if (!this.element?.open) return;
    this.suspendedFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.isSuspended = true;
    this.element.close();
    document.body.classList.remove('has-open-dialog');
    this.onOpenChange(false);
  }

  public setAuthenticated(profile: AuthProfile | undefined): void {
    this.profile = profile;
    this.comments.setAuthenticated(Boolean(profile));
    this.favorite.setProfile(profile);
    if (this.element) this.element.dataset.authenticated = String(Boolean(profile));
  }

  public close(shouldAnimate = true, shouldRestoreFocus = true): void {
    if (!this.element || (!this.element.open && !this.isSuspended)) return;
    if (this.isSuspended) shouldAnimate = false;
    this.request?.abort();
    this.comments.destroy();
    this.favorite.destroy();
    this.shouldRestoreFocus = shouldRestoreFocus;
    if (!shouldAnimate) {
      this.finishClose(shouldRestoreFocus);
      return;
    }
    if (this.isClosing) return;
    this.isClosing = true;
    this.element.classList.add('is-closing');
    const duration = getComputedStyle(this.element).animationDuration;
    const milliseconds = duration.endsWith('ms')
      ? Number(duration.slice(0, -2))
      : Number(duration.replace('s', '')) * 1000;
    this.closeTimer = globalThis.setTimeout(
      () => this.finishClose(),
      Number.isFinite(milliseconds) ? milliseconds : 0,
    );
  }

  public destroy(): void {
    this.controller?.abort();
    this.request?.abort();
    this.request = undefined;
    this.comments.destroy();
    this.favorite.destroy();
    this.feedback?.destroy();
    this.feedback = undefined;
    this.finishClose(false);
    this.element = undefined;
  }
}
