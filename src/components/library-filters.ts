import { getCategories } from '../api/minigames-api';
import { ApiError } from '../api/http-client';
import { enableHorizontalDrag } from '../utils/horizontal-drag';
import { escapeHtml } from '../utils/html';
import type { GameCategory, GameSort } from '../types/api';
import { ContentFeedback } from './content-feedback';
import { snackbar } from './snackbar';
import { LibrarySort } from './library-sort';

export type CategoriesState =
  { kind: 'loading' | 'empty' | 'error' } | { kind: 'ready'; defaultCategory: string };

interface LibraryFilterEvents {
  onCategory: (category: string) => void;
  onSort: (sort: GameSort) => void;
  onState: (state: CategoriesState) => void;
}

function readCategories(response: unknown): GameCategory[] {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('data' in response) ||
    !Array.isArray(response.data)
  )
    throw new TypeError('Expected a category list.');
  const categories: GameCategory[] = [];
  const slugs = new Set<string>();
  for (const value of response.data) {
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof value.slug !== 'string' ||
      !value.slug.trim() ||
      typeof value.label !== 'string' ||
      !value.label.trim() ||
      typeof value.isDefault !== 'boolean' ||
      slugs.has(value.slug)
    ) {
      throw new TypeError('Invalid category data.');
    }
    slugs.add(value.slug);
    categories.push({ slug: value.slug, label: value.label, isDefault: value.isDefault });
  }
  if (categories.length > 0 && categories.filter((category) => category.isDefault).length !== 1) {
    throw new TypeError('Expected exactly one default category.');
  }
  return categories;
}

export class LibraryFilters {
  private readonly sort = new LibrarySort();
  private root: HTMLElement | undefined;
  private feedback: ContentFeedback | undefined;
  private requestController: AbortController | undefined;
  private lifetime: AbortSignal | undefined;
  private selectedCategory: string | undefined;

  public constructor(private readonly events: LibraryFilterEvents) {}

  private async loadCategories(isRetry = false): Promise<void> {
    if (this.lifetime?.aborted || !this.feedback) return;
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;
    const isCurrent = (): boolean =>
      !this.lifetime?.aborted &&
      !controller.signal.aborted &&
      this.requestController === controller;
    this.feedback.showLoading('categories', 'Loading game categories…');
    this.events.onState({ kind: 'loading' });
    try {
      const response = await getCategories(controller.signal);
      if (!isCurrent()) return;
      const categories = readCategories(response);
      if (categories.length === 0) {
        this.feedback.showEmpty({
          title: 'Data Not Found',
          message: 'No game categories are available yet.',
        });
        this.events.onState({ kind: 'empty' });
      } else {
        this.feedback.showContent(
          categories
            .map(
              (category) => `
          <button class="library-filters__chip" type="button"
            data-category="${escapeHtml(category.slug)}" aria-pressed="false">${escapeHtml(category.label)}</button>
        `,
            )
            .join(''),
        );
        const defaultCategory = categories.find((category) => category.isDefault);
        if (!defaultCategory) throw new TypeError('A default category is required.');
        this.paintCategory();
        this.events.onState({ kind: 'ready', defaultCategory: defaultCategory.slug });
      }
      if (isRetry) snackbar.show('Game categories loaded successfully.', 'success');
    } catch (error) {
      if (!isCurrent()) return;
      this.feedback.showError({
        title: 'Unable to load categories',
        message:
          error instanceof ApiError
            ? error.message
            : 'The server returned unexpected category data. Please try again.',
        onRetry: () => this.loadCategories(true),
      });
      this.events.onState({ kind: 'error' });
      snackbar.show('Categories could not be loaded. Use Retry to try again.', 'error');
    }
  }

  private paintCategory(): void {
    const chips = this.root?.querySelectorAll<HTMLButtonElement>('[data-category]') ?? [];
    for (const chip of chips) {
      const isSelected = chip.dataset.category === this.selectedCategory;
      chip.classList.toggle('library-filters__chip--active', isSelected);
      chip.setAttribute('aria-pressed', String(isSelected));
    }
  }

  public setSelection(category: string | undefined, sort: GameSort): void {
    this.selectedCategory = category;
    this.paintCategory();
    this.sort.setValue(sort);
  }

  public render(): string {
    return `
      <div class="library-filters">
        <div class="library-filters__categories" role="group" aria-label="Game categories" aria-busy="true"></div>
        ${this.sort.render()}
      </div>
    `;
  }

  public bindEvents(signal: AbortSignal): void {
    this.lifetime = signal;
    this.sort.bindEvents(signal, this.events.onSort);
    this.root = document.querySelector<HTMLElement>('.library-filters__categories') ?? undefined;
    if (!this.root || signal.aborted) return;
    this.feedback = new ContentFeedback(this.root);
    signal.addEventListener(
      'abort',
      () => {
        this.requestController?.abort();
        this.feedback?.destroy();
        this.root = undefined;
      },
      { once: true },
    );
    enableHorizontalDrag(this.root, signal);
    this.root.addEventListener(
      'click',
      (event) => {
        const chip =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-category]')
            : undefined;
        const category = chip?.dataset.category;
        if (category && category !== this.selectedCategory) this.events.onCategory(category);
      },
      { signal },
    );
    void this.loadCategories();
  }
}
