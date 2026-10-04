import { escapeHtml } from '../utils/html.ts';

export type SkeletonLayout =
  'cards' | 'slider' | 'leaderboard' | 'details' | 'comments' | 'categories';

interface ErrorFeedback {
  message: string;
  onRetry: () => Promise<void> | void;
  title?: string;
  imageSrc?: string;
}

interface EmptyFeedback {
  title: string;
  message: string;
  imageSrc?: string;
}

const skeletonCounts: Record<SkeletonLayout, number> = {
  cards: 6,
  slider: 3,
  leaderboard: 5,
  details: 1,
  comments: 3,
  categories: 7,
};

function renderSkeleton(layout: SkeletonLayout): string {
  if (layout === 'categories') {
    return `<div class="feedback-skeleton feedback-skeleton--categories" aria-hidden="true">
      ${'<div class="feedback-skeleton__item"><span class="feedback-skeleton__line"></span></div>'.repeat(skeletonCounts.categories)}
    </div>`;
  }
  const lines = `
    <span class="feedback-skeleton__line feedback-skeleton__line--title"></span>
    <span class="feedback-skeleton__line"></span>
    <span class="feedback-skeleton__line feedback-skeleton__line--short"></span>
  `;

  const item = `
    <div class="feedback-skeleton__item">
      <span class="feedback-skeleton__media"></span>
      <div class="feedback-skeleton__text">${lines}</div>
    </div>
  `;

  return `
    <div class="feedback-skeleton feedback-skeleton--${layout}" aria-hidden="true">
      ${item.repeat(skeletonCounts[layout])}
    </div>
  `;
}

export class ContentFeedback {
  private readonly root: HTMLElement;
  private controller: AbortController | undefined;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  private replace(markup: string, state: 'loading' | 'error' | 'empty' | 'ready'): void {
    this.controller?.abort();
    this.controller = undefined;

    this.root.dataset.feedbackState = state;
    this.root.setAttribute('aria-busy', String(state === 'loading'));
    this.root.innerHTML = markup;
  }

  private async retry(
    button: HTMLButtonElement,
    text: HTMLElement,
    onRetry: ErrorFeedback['onRetry'],
    signal: AbortSignal,
  ): Promise<void> {
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = 'Retrying…';

    try {
      await onRetry();
    } catch (error) {
      if (!signal.aborted) {
        text.textContent =
          error instanceof Error && error.message
            ? error.message
            : 'The request still could not be completed. Please try again.';
      }
    } finally {
      if (!signal.aborted) {
        button.disabled = false;
        button.textContent = 'Retry';
      }
    }
  }

  public showLoading(layout: SkeletonLayout, label = 'Loading content…'): void {
    this.replace(
      `<span class="visually-hidden" role="status">${escapeHtml(label)}</span>
       ${renderSkeleton(layout)}`,
      'loading',
    );
  }

  public showError({
    message,
    onRetry,
    title = 'Unable to load this section',
    imageSrc,
  }: ErrorFeedback): void {
    this.replace(
      `<div class="content-feedback content-feedback--error${imageSrc ? ' content-feedback--illustrated' : ''}" role="alert">
    ${
      imageSrc
        ? `<img
            class="content-feedback__image"
            src="${escapeHtml(imageSrc)}"
            alt=""
            aria-hidden="true"
          />`
        : `<span class="content-feedback__symbol" aria-hidden="true">!</span>`
    }
    <div class="content-feedback__body">
      <h3 class="content-feedback__title">${escapeHtml(title)}</h3>
      <p class="content-feedback__message">${escapeHtml(message)}</p>
    </div>
    <button class="content-feedback__retry" type="button">Retry</button>
  </div>`,
      'error',
    );

    this.controller = new AbortController();
    const { signal } = this.controller;

    const button = this.root.querySelector<HTMLButtonElement>('.content-feedback__retry');
    const text = this.root.querySelector<HTMLElement>('.content-feedback__message');

    if (button && text) {
      button.addEventListener(
        'click',
        () => {
          void this.retry(button, text, onRetry, signal);
        },
        { signal },
      );
    }
  }

  public showEmpty({ title, message, imageSrc }: EmptyFeedback): void {
    this.replace(
      `<div class="content-feedback content-feedback--empty${imageSrc ? ' content-feedback--illustrated' : ''}" role="status">
      ${
        imageSrc
          ? `<img
              class="content-feedback__image"
              src="${escapeHtml(imageSrc)}"
              alt=""
              aria-hidden="true"
            />`
          : `<span class="content-feedback__symbol" aria-hidden="true">○</span>`
      }
      <div class="content-feedback__body">
        <h3 class="content-feedback__title">${escapeHtml(title)}</h3>
        <p class="content-feedback__message">${escapeHtml(message)}</p>
      </div>
    </div>`,
      'empty',
    );
  }

  public showContent(markup: string): void {
    this.replace(markup, 'ready');
  }

  public destroy(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.root.removeAttribute('aria-busy');
    delete this.root.dataset.feedbackState;
  }
}
