import type { AuthProfile } from '../auth/email-auth';
import sendIcon from '../assets/icons/send-comment.svg';
import heartIcon from '../assets/icons/comment-heart.svg';
import activeHeartIcon from '../assets/icons/comment-heart-active.svg';
import { escapeHtml } from '../utils/game';
import { formatRelativeTime } from '../utils/relative-time';
import { getGameComments, submitGameComment, toggleCommentLike } from '../api/minigames-api';
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
  private profile: AuthProfile | undefined;
  private submission: AbortController | undefined;
  private readonly likeRequests = new Map<string, AbortController>();
  private readonly avatarColors = new Map<string, number>();

  constructor(private readonly requireSession?: () => AuthProfile | undefined) {}

  private renderComment(comment: GameComment): string {
    const name = comment.authorName.trim();
    let color = this.avatarColors.get(name);
    if (color === undefined) {
      color = Math.floor(Math.random() * 3) + 1;
      this.avatarColors.set(name, color);
    }
    return `<li><article class="game-comment">
      <header class="game-comment__header">
        <div class="game-comment__author">
          <span class="game-comment__avatar game-comment__avatar--${color}" aria-hidden="true">${escapeHtml(([...name][0] ?? '?').toUpperCase())}</span>
          <h4 class="game-comment__name">${escapeHtml(comment.authorName)}</h4>
        </div>
        <time class="game-comment__date" datetime="${escapeHtml(comment.createdAt)}">${formatRelativeTime(comment.createdAt)}</time>
      </header>
      <p class="game-comment__text"></p>
      <button class="game-comment__like" data-comment-id="${escapeHtml(comment.commentId)}" data-likes-count="${comment.likesCount}" aria-pressed="${Boolean(this.profile) && comment.isLikedByCurrentUser}" type="button" ${this.requireSession ? '' : 'disabled'} title="Sign in to like comments" aria-label="${comment.likesCount} likes">
        <img src="${this.profile && comment.isLikedByCurrentUser ? activeHeartIcon : heartIcon}" alt="" /><span>${comment.likesCount}</span>
      </button>
    </article></li>`;
  }

  private async load(isRetry = false): Promise<void> {
    if (!this.feedback || !this.slug || this.controller?.signal.aborted) return;
    this.request?.abort();
    this.cancelLikes();
    const request = new AbortController();
    this.request = request;
    const isCurrent = (): boolean => this.request === request && !request.signal.aborted;
    this.feedback.showLoading('comments', 'Loading latest comments…');
    if (this.heading) this.heading.textContent = 'Comments';
    try {
      const response = readGameComments(
        await getGameComments(this.slug, request.signal, this.profile?.email),
      );
      if (!isCurrent()) return;
      if (this.heading) this.heading.textContent = `Comments (${response.totalComments})`;
      if (response.data.length === 0) {
        this.feedback.showEmpty({
          title: 'No comments yet',
          message: 'This game has no comments to display.',
        });
      } else {
        this.feedback.showContent(
          `<ol class="game-comments__list">${response.data.map((comment) => this.renderComment(comment)).join('')}</ol>`,
        );
      }
      const texts = this.dialog?.querySelectorAll('.game-comment__text') ?? [];
      for (const [index, element] of texts.entries())
        element.textContent = response.data[index]?.text ?? '';
      this.paintForm();
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

  private resizeInput(): void {
    const input = this.dialog?.querySelector<HTMLTextAreaElement>('.game-comments__input');
    if (!input) return;
    input.style.height = 'auto';
    const styles = getComputedStyle(input);
    const borderHeight =
      Number(styles.borderTopWidth.replace('px', '')) +
      Number(styles.borderBottomWidth.replace('px', ''));
    input.style.height = `${input.scrollHeight + (Number.isFinite(borderHeight) ? borderHeight : 0)}px`;
  }

  private paintForm(): void {
    const isAuthenticated = Boolean(this.profile);
    const isPending = Boolean(this.submission);
    const input = this.dialog?.querySelector<HTMLTextAreaElement>('.game-comments__input');
    if (input) {
      input.placeholder = isAuthenticated ? 'Write a comment' : 'Sign in to post a comment';
      input.disabled = !isAuthenticated || isPending;
    }
    const button = this.dialog?.querySelector<HTMLButtonElement>('.game-comments__submit');
    if (button) {
      button.disabled = !isAuthenticated || isPending;
      button.setAttribute('aria-label', isPending ? 'Sending comment…' : 'Submit a comment');
    }
    this.dialog
      ?.querySelector('.game-comments__form')
      ?.setAttribute('aria-busy', String(isPending));
    const avatar = this.dialog?.querySelector('.game-comments__avatar');
    if (avatar)
      avatar.textContent = ([...(this.profile?.displayName.trim() ?? '')][0] ?? '?').toUpperCase();
    const hint = this.dialog?.querySelector('.game-comments__hint');
    if (hint) {
      hint.textContent = isAuthenticated
        ? 'Enter to send. Shift+Enter for a new line. Maximum 500 characters.'
        : 'Sign in to post or like comments.';
      if (isPending) hint.textContent = 'Sending comment…';
    }
    const likes = this.dialog?.querySelectorAll<HTMLButtonElement>('.game-comment__like') ?? [];
    for (const like of likes) this.paintLike(like);
  }

  private cancelLikes(): void {
    for (const request of this.likeRequests.values()) request.abort();
    this.likeRequests.clear();
  }

  private paintLike(button: HTMLButtonElement): void {
    const isPending = this.likeRequests.has(button.dataset.commentId ?? '');
    const isLiked = Boolean(this.profile) && button.getAttribute('aria-pressed') === 'true';
    const count = button.dataset.likesCount ?? '0';
    let action = isLiked ? 'Unlike comment' : 'Like comment';
    if (!this.profile) action = 'Sign in to like comments';
    if (button.dataset.retryLike) action = 'Retry comment like status';
    if (isPending) action = 'Updating comment like…';
    button.disabled = isPending || !this.requireSession;
    button.setAttribute('aria-busy', String(isPending));
    button.setAttribute('aria-pressed', String(isLiked));
    button.setAttribute('aria-label', `${action}. ${count} likes`);
    button.title = action;
    const icon = button.querySelector('img');
    if (icon) icon.src = isLiked ? activeHeartIcon : heartIcon;
    const label = button.querySelector('span');
    if (label) label.textContent = isPending ? '…' : count;
  }

  private async likeComment(button: HTMLButtonElement): Promise<void> {
    const id = button.dataset.commentId;
    if (!id || this.likeRequests.has(id)) return;
    const profile = this.requireSession?.();
    if (!profile) {
      snackbar.show('Please sign in to like comments.', 'error');
      return;
    }
    if (button.dataset.retryLike) {
      await this.load(true);
      return;
    }
    const request = new AbortController();
    this.likeRequests.set(id, request);
    this.paintLike(button);
    const isCurrent = (): boolean =>
      this.likeRequests.get(id) === request &&
      !request.signal.aborted &&
      this.profile?.email === profile.email &&
      button.isConnected;
    try {
      const state = await toggleCommentLike(id, profile.email, request.signal);
      if (!isCurrent()) return;
      button.dataset.likesCount = String(state.likesCount);
      button.setAttribute('aria-pressed', String(state.isLikedByCurrentUser));
      snackbar.show(
        state.isLikedByCurrentUser ? 'Comment liked.' : 'Comment like removed.',
        'success',
      );
    } catch {
      if (!isCurrent()) return;
      button.dataset.retryLike = 'true';
      snackbar.show(
        'Comment like could not be confirmed. Click again to reload its status before trying another toggle.',
        'error',
      );
    } finally {
      if (isCurrent()) {
        this.likeRequests.delete(id);
        this.paintLike(button);
      }
    }
  }

  private async submit(): Promise<void> {
    if (this.submission || !this.slug || !this.dialog) return;
    const profile = this.requireSession?.();
    if (!profile) {
      snackbar.show('Sign in to post a comment.', 'error');
      return;
    }
    const input = this.dialog.querySelector<HTMLTextAreaElement>('.game-comments__input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || text.length > 500) {
      input.setAttribute('aria-invalid', 'true');
      snackbar.show('Write a comment of 1–500 characters.', 'error');
      return;
    }
    if (profile.displayName.length < 2 || profile.displayName.length > 30) {
      snackbar.show('Your profile needs a name of 2–30 characters before posting.', 'error');
      return;
    }
    const request = new AbortController();
    this.submission = request;
    const isCurrent = (): boolean =>
      this.submission === request &&
      !request.signal.aborted &&
      this.profile?.email === profile.email;
    this.paintForm();
    try {
      await submitGameComment(this.slug, profile.email, profile.displayName, text, request.signal);
      if (!isCurrent()) return;
      input.value = '';
      input.style.height = '';
      input.removeAttribute('aria-invalid');
      snackbar.show('Comment posted successfully.', 'success');
      await this.load();
    } catch (error) {
      if (!isCurrent()) return;
      const isRejected =
        error instanceof ApiError &&
        error.kind === 'http' &&
        error.status !== undefined &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408;
      snackbar.show(
        isRejected
          ? 'Comment was rejected. Your text is saved here; check it and try again.'
          : 'Comment result is unknown. Your text is saved here; check the latest comments before sending again.',
        'error',
      );
    } finally {
      if (isCurrent()) {
        this.submission = undefined;
        this.paintForm();
      }
    }
  }

  public render(): string {
    return `<section class="game-comments" aria-labelledby="game-comments-title">
      <h3 class="game-comments__title" id="game-comments-title">Comments</h3>
      <form class="game-comments__form">
        <span class="game-comments__avatar" aria-hidden="true">U</span>
        <label class="visually-hidden" for="game-comment">Write a comment</label>
        <textarea class="game-comments__input" id="game-comment" name="comment" rows="1" maxlength="500" disabled placeholder="Sign in to post a comment" aria-describedby="game-comment-hint"></textarea>
        <button class="game-comments__submit" type="submit" disabled aria-label="Submit a comment"><img src="${sendIcon}" alt="" /></button>
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
    if (input) {
      input.value = '';
      input.style.height = '';
    }
    input?.addEventListener(
      'input',
      () => {
        input.removeAttribute('aria-invalid');
        this.resizeInput();
      },
      { signal },
    );
    input?.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
          return;
        }

        event.preventDefault();
        void this.submit();
      },
      { signal },
    );
    dialog.querySelector('.game-comments__form')?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void this.submit();
      },
      { signal },
    );
    dialog.addEventListener(
      'click',
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('.game-comment__like')
            : undefined;
        if (button && dialog.contains(button)) void this.likeComment(button);
      },
      { signal },
    );
    this.paintForm();
    void this.load();
  }

  public setAuthenticated(profile: AuthProfile | undefined): void {
    const isChanged = this.profile?.email !== profile?.email;
    this.profile = profile;
    if (isChanged) {
      this.submission?.abort();
      this.submission = undefined;
      if (this.slug) void this.load();
    }
    this.paintForm();
  }

  public destroy(): void {
    this.controller?.abort();
    this.cancelLikes();
    this.request?.abort();
    this.submission?.abort();
    this.submission = undefined;
    this.avatarColors.clear();
    this.request = undefined;
    this.feedback?.destroy();
    this.feedback = undefined;
    this.heading = undefined;
    this.dialog = undefined;
    this.slug = undefined;
  }
}
