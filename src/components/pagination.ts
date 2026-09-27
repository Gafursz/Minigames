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

    root.addEventListener(
      'click',
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-page]')
            : undefined;
        if (!button || button.disabled) return;
        this.currentPage = Number(button.dataset.page);
        root.innerHTML = this.renderControls();
      },
      { signal },
    );

    const updateVisibleCount = (): void => {
      const count = Number(getComputedStyle(root).getPropertyValue('--page-buttons'));
      if (count === this.visibleCount) return;
      this.visibleCount = count;
      root.innerHTML = this.renderControls();
    };
    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(root);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
}
