import sendIcon from '../assets/icons/send-comment.svg';
import heartIcon from '../assets/icons/comment-heart.svg';
import { escapeHtml } from '../utils/game';
import { formatRelativeTime } from '../utils/relative-time';
import { getGameComments } from '../api/minigames-api';
import { ApiError } from '../api/http-client';
import { readGameComments } from '../features/game-details/game-data';
import { ContentFeedback } from './content-feedback';
import { snackbar } from './snackbar';
import type { GameComment } from '../types/api';

export class GameComments {
  private controller: AbortController | undefined;
  private request: AbortController | undefined;
  private feedback: ContentFeedback | undefined;
  private heading: HTMLElement | undefined;
  private slug: string | undefined;
  private dialog: HTMLDialogElement | undefined;
  private isAuthenticated = false;

  constructor(private readonly canUseProtectedAction?: () => boolean) {}

  private renderComment(comment: GameComment, index: number): string {
    return `<li><article class="game-comment">
      <header class="game-comment__header">
        <div class="game-comment__author">
          <span class="game-comment__avatar game-comment__avatar--${(index % 3) + 1}" aria-hidden="true">${escapeHtml([...comment.authorName][0] ?? '?')}</span>
          <h4 class="game-comment__name">${escapeHtml(comment.authorName)}</h4>
        </div>
        <time class="game-comment__date" datetime="${escapeHtml(comment.createdAt)}">${formatRelativeTime(comment.createdAt)}</time>
      </header>
      <p class="game-comment__text">${escapeHtml(comment.text)}</p>
      <button class="game-comment__like" type="button" ${this.canUseProtectedAction ? '' : 'disabled'} title="Sign in to like comments" aria-label="${comment.likesCount} likes">
        <img src="${heartIcon}" alt="" /><span>${comment.likesCount}</span>
      </button>
    </article></li>`;
  }

  private async load(isRetry = false): Promise<void> {
    if (!this.feedback || !this.slug || this.controller?.signal.aborted) return;
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    const isCurrent = (): boolean => this.request === request && !request.signal.aborted;
    this.feedback.showLoading('comments', 'Loading latest comments…');
    if (this.heading) this.heading.textContent = 'Comments';
    try {
      const response = readGameComments(await getGameComments(this.slug, request.signal));
      if (!isCurrent()) return;
      if (this.heading) this.heading.textContent = `Comments (${response.totalComments})`;
      if (response.data.length === 0) {
        this.feedback.showEmpty({
          title: 'No comments yet',
          message: 'This game has no comments to display.',
        });
      } else {
        this.feedback.showContent(
          `<ol class="game-comments__list">${response.data.map((comment, index) => this.renderComment(comment, index)).join('')}</ol>`,
        );
      }
      this.setAuthenticated(this.isAuthenticated);
      if (isRetry) snackbar.show('Comments loaded successfully.', 'success');
    } catch (error) {
      if (!isCurrent()) return;
      this.feedback.showError({
        title: 'Unable to load comments',
        message:
          error instanceof ApiError
            ? error.message
            : 'The server returned unexpected comments. Please try again.',
        onRetry: () => this.load(true),
      });
      snackbar.show('Comments could not be loaded. Use Retry to try again.', 'error');
    }
  }

  public render(): string {
    return `<section class="game-comments" aria-labelledby="game-comments-title">
      <h3 class="game-comments__title" id="game-comments-title">Comments</h3>
      <form class="game-comments__form">
        <span class="game-comments__avatar" aria-hidden="true">U</span>
        <label class="visually-hidden" for="game-comment">Write a comment</label>
        <textarea class="game-comments__input" id="game-comment" name="comment" rows="1" placeholder="Sign in to post a comment" aria-describedby="game-comment-hint"></textarea>
        <button class="game-comments__submit" type="submit" ${this.canUseProtectedAction ? '' : 'disabled'} aria-label="Submit a comment"><img src="${sendIcon}" alt="" /></button>
      </form>
      <p class="game-comments__hint" id="game-comment-hint">Sign in to post or like comments.</p>
      <div class="game-comments__content" aria-busy="true"></div>
    </section>`;
  }

  public bindEvents(dialog: HTMLDialogElement, slug: string): void {
    this.destroy();
    const root = dialog.querySelector<HTMLElement>('.game-comments__content');
    if (!root) return;
    this.slug = slug;
    this.dialog = dialog;
    this.feedback = new ContentFeedback(root);
    this.heading = dialog.querySelector<HTMLElement>('.game-comments__title') ?? undefined;
    this.controller = new AbortController();
    const { signal } = this.controller;
    const input = dialog.querySelector<HTMLTextAreaElement>('.game-comments__input');
    input?.addEventListener(
      'input',
      () => {
        input.style.height = 'auto';
        const styles = getComputedStyle(input);
        const borderHeight =
          Number(styles.borderTopWidth.replace('px', '')) +
          Number(styles.borderBottomWidth.replace('px', ''));
        input.style.height = `${input.scrollHeight + (Number.isFinite(borderHeight) ? borderHeight : 0)}px`;
      },
      { signal },
    );
    dialog.querySelector('.game-comments__form')?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        if (!this.canUseProtectedAction) snackbar.show('Sign in to post a comment.', 'error');
        else if (this.canUseProtectedAction())
          snackbar.show('Comment posting will be available in a later update.');
      },
      { signal },
    );
    dialog.addEventListener(
      'click',
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('.game-comment__like') &&
          this.canUseProtectedAction?.()
        )
          snackbar.show('Comment likes will be available in a later update.');
      },
      { signal },
    );
    void this.load();
  }

  public setAuthenticated(isAuthenticated: boolean): void {
    this.isAuthenticated = isAuthenticated;
    const input = this.dialog?.querySelector<HTMLTextAreaElement>('.game-comments__input');
    if (input) {
      input.placeholder = isAuthenticated ? 'Write a comment' : 'Sign in to post a comment';
    }
    const hint = this.dialog?.querySelector('.game-comments__hint');
    if (hint)
      hint.textContent = isAuthenticated
        ? 'Comment posting and likes will be available in a later update.'
        : 'Sign in to post or like comments.';
    const buttons = this.dialog?.querySelectorAll('.game-comment__like') ?? [];
    for (const button of buttons) {
      button.setAttribute(
        'title',
        isAuthenticated
          ? 'Comment likes will be available in a later update.'
          : 'Sign in to like comments',
      );
      if (!isAuthenticated) button.setAttribute('aria-pressed', 'false');
    }
  }

  public destroy(): void {
    this.controller?.abort();
    this.request?.abort();
    this.request = undefined;
    this.feedback?.destroy();
    this.feedback = undefined;
    this.heading = undefined;
    this.dialog = undefined;
    this.slug = undefined;
  }
}
