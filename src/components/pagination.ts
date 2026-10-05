import { getPageWindow } from '../utils/pagination';

export class Pagination {
  private currentPage = 1;
  private visibleCount = 3;
  private readonly totalPages = 4;

  private renderControls(): string {
    return `
      <button class="pagination__button" type="button" data-page="${this.currentPage - 1}"
        data-direction="previous" aria-label="Previous page" ${this.currentPage === 1 ? 'disabled' : ''}>
        <span class="pagination__arrow" aria-hidden="true">‹</span>
      </button>
      ${getPageWindow(this.currentPage, this.totalPages, this.visibleCount)
        .map(
          (page) => `
        <button class="pagination__button${page === this.currentPage ? ' pagination__button--active' : ''}"
          type="button" data-page="${page}" aria-label="Page ${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>
      `,
        )
        .join('')}
      <button class="pagination__button" type="button" data-page="${this.currentPage + 1}"
        data-direction="next" aria-label="Next page" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
        <span class="pagination__arrow" aria-hidden="true">›</span>
      </button>
      <span class="visually-hidden" aria-live="polite" aria-atomic="true">Page ${this.currentPage} of ${this.totalPages}</span>
    `;
  }

  public render(): string {
    return `<nav class="pagination" aria-label="Game pages">${this.renderControls()}</nav>`;
  }

  public bindEvents(signal: AbortSignal): void {
    const root = document.querySelector<HTMLElement>('.pagination');
    if (!root) return;

    const setPage = (page: number, direction?: string): void => {
      this.currentPage = Math.min(this.totalPages, Math.max(1, page));
      root.innerHTML = this.renderControls();
      const selector = direction
        ? `[data-direction="${direction}"]:not(:disabled)`
        : '[aria-current="page"]';
      const focusTarget =
        root.querySelector<HTMLButtonElement>(selector) ??
        root.querySelector<HTMLButtonElement>('[aria-current="page"]');
      focusTarget?.focus();
    };

    root.addEventListener(
      'click',
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-page]')
            : undefined;
        if (!button || button.disabled) return;
        setPage(Number(button.dataset.page), button.dataset.direction);
      },
      { signal },
    );

    root.addEventListener(
      'keydown',
      (event) => {
        let page: number;
        switch (event.key) {
          case 'ArrowLeft': {
            page = this.currentPage - 1;
            break;
          }
          case 'ArrowRight': {
            page = this.currentPage + 1;
            break;
          }
          case 'Home': {
            page = 1;
            break;
          }
          case 'End': {
            page = this.totalPages;
            break;
          }
          default: {
            return;
          }
        }
        event.preventDefault();
        setPage(page);
      },
      { signal },
    );

    const updateVisibleCount = (): void => {
      const count = Number(getComputedStyle(root).getPropertyValue('--page-buttons')) || 3;
      if (count === this.visibleCount) return;
      this.visibleCount = count;
      const shouldRestoreFocus = root.contains(document.activeElement);
      root.innerHTML = this.renderControls();
      if (shouldRestoreFocus)
        root.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
    };
    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(root);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
}
