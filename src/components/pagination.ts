import { getPageWindow } from '../utils/pagination';
import type { PaginationMetadata } from '../types/api';

export class Pagination {
  private currentPage = 1;
  private visibleCount = 3;
  private totalPages = 1;
  private isDisabled = true;
  private isLoading = true;
  private root: HTMLElement | undefined;

  public constructor(private readonly onChange: (page: number) => void = () => {}) {}

  private paint(): void {
    if (!this.root) return;
    const hadFocus = this.root.contains(document.activeElement);
    this.root.setAttribute('aria-busy', String(this.isLoading));
    this.root.innerHTML = this.renderControls();
    if (!hadFocus) return;
    const current = this.root.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (current && !current.disabled) current.focus({ preventScroll: true });
    else this.root.focus({ preventScroll: true });
  }

  private renderControls(): string {
    return `
      <button class="pagination__button" type="button" data-page="${this.currentPage - 1}"
        data-direction="previous" aria-label="Previous page" ${this.isDisabled || this.currentPage === 1 ? 'disabled' : ''}>
        <span class="pagination__arrow" aria-hidden="true">‹</span>
      </button>
      ${getPageWindow(this.currentPage, this.totalPages, this.visibleCount)
        .map(
          (page) => `
        <button class="pagination__button${page === this.currentPage ? ' pagination__button--active' : ''}"
          type="button" data-page="${page}" aria-label="Page ${page}" ${this.isDisabled ? 'disabled' : ''} ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>
      `,
        )
        .join('')}
      <button class="pagination__button" type="button" data-page="${this.currentPage + 1}"
        data-direction="next" aria-label="Next page" ${this.isDisabled || this.currentPage === this.totalPages ? 'disabled' : ''}>
        <span class="pagination__arrow" aria-hidden="true">›</span>
      </button>
      <span class="visually-hidden" aria-live="polite" aria-atomic="true">Page ${this.currentPage} of ${this.totalPages}</span>
    `;
  }

  public showLoading(): void {
    this.isLoading = true;
    this.isDisabled = true;
    this.paint();
  }

  public showUnavailable(): void {
    this.currentPage = 1;
    this.totalPages = 1;
    this.isLoading = false;
    this.isDisabled = true;
    this.paint();
  }

  public update(meta: Pick<PaginationMetadata, 'page' | 'totalPages'>, isEmpty = false): void {
    this.totalPages = isEmpty ? 1 : Math.max(1, meta.totalPages);
    this.currentPage = isEmpty ? 1 : Math.min(this.totalPages, Math.max(1, meta.page));
    this.isDisabled = false;
    this.isLoading = false;
    this.paint();
  }

  public render(): string {
    return `<nav class="pagination" aria-label="Game pages" aria-busy="${this.isLoading}" tabindex="-1">${this.renderControls()}</nav>`;
  }

  public bindEvents(signal: AbortSignal): void {
    const root = document.querySelector<HTMLElement>('.pagination');
    if (!root) return;
    this.root = root;

    const setPage = (page: number): void => {
      if (this.isDisabled || !Number.isSafeInteger(page)) return;
      const next = Math.min(this.totalPages, Math.max(1, page));
      if (next !== this.currentPage) this.onChange(next);
    };

    root.addEventListener(
      'click',
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-page]')
            : undefined;
        if (!button || button.disabled) return;
        setPage(Number(button.dataset.page));
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
      this.paint();
    };
    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(root);
    signal.addEventListener(
      'abort',
      () => {
        observer.disconnect();
        this.root = undefined;
      },
      { once: true },
    );
  }
}
