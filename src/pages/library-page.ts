import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { LibraryFilters } from '../components/library-filters';
import { Pagination } from '../components/pagination';
import { LibraryGames } from '../features/library/library-games';
import type { LibraryListState } from '../features/library/library-games';
import type { CategoriesState } from '../components/library-filters';
import type { QueryChanges, RouteState } from '../router/route';

export class LibraryPage {
  private readonly header = new Header('library');
  private readonly footer = new Footer();
  private readonly controller = new AbortController();
  private readonly filters = new LibraryFilters({
    onCategory: (category) => this.navigate({ category, page: 1 }),
    onSort: (sort) => this.navigate({ sort, page: 1 }),
    onState: (state) => this.onCategoriesState(state),
  });
  private readonly pagination = new Pagination((page) => this.navigate({ page }));
  private games: LibraryGames | undefined;
  private route: RouteState | undefined;
  private categoriesState: CategoriesState = { kind: 'loading' };
  private requestKey: string | undefined;

  public constructor(
    private readonly navigate: (changes: QueryChanges, shouldReplace?: boolean) => void = () => {},
  ) {}

  private onGamesState(state: LibraryListState): void {
    if (this.controller.signal.aborted) return;
    if (state.kind === 'loading') {
      this.pagination.showLoading();
      return;
    }
    if (state.kind !== 'ready') {
      this.pagination.showUnavailable();
      return;
    }
    const { meta, isEmpty } = state;
    this.pagination.update(meta, isEmpty);
    if (!this.route) return;
    const query = this.route.library;
    // An out-of-range bookmark needs a real page-one request, not locally sliced data.
    if (isEmpty && meta.totalItems > 0 && query.page !== 1) {
      this.navigate({ page: 1 }, true);
      return;
    }
    const page = isEmpty ? 1 : Math.min(Math.max(1, meta.totalPages), meta.page);
    if (query.page === page) {
      return;
    }

    // The response already describes this normalized page; do not request it twice.
    this.requestKey = JSON.stringify({ category: query.category, sort: query.sort, page });
    this.navigate({ page }, true);
  }

  private onCategoriesState(state: CategoriesState): void {
    if (this.controller.signal.aborted) return;
    this.categoriesState = state;
    if (state.kind === 'ready') {
      this.updateGames();
    } else {
      this.requestKey = undefined;
      if (state.kind === 'loading') this.games?.showLoading();
      else this.games?.clear();
    }
  }

  private updateGames(): void {
    if (this.controller.signal.aborted || !this.route || !this.games) return;
    const { category, sort, page } = this.route.library;
    this.filters.setSelection(category, sort);
    if (this.categoriesState.kind !== 'ready') return;
    if (!category) {
      this.navigate({ category: this.categoriesState.defaultCategory }, true);
      return;
    }
    const query = { category, sort, page };
    const key = JSON.stringify(query);
    if (key === this.requestKey) return;
    this.requestKey = key;
    void this.games.load(query);
  }

  public updateRoute(route: RouteState): void {
    this.route = route;
    this.updateGames();
  }

  public render(): string {
    return `
      ${this.header.render()}

      <main class="library">
        <section class="library__intro" aria-labelledby="library-title">
          <h1 class="library__title" id="library-title">Game Library</h1>
          <p class="library__description">Browse our collection of casual mini-games</p>
        </section>
        ${this.filters.render()}
        <section class="library__cards" aria-label="Games" aria-busy="true"></section>
        ${this.pagination.render()}
      </main>

      ${this.footer.render()}
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
    this.pagination.bindEvents(this.controller.signal);
    const cards = document.querySelector<HTMLElement>('.library__cards');
    if (!cards) return;
    this.games?.destroy();
    this.games = new LibraryGames(cards, (state) => this.onGamesState(state));
    this.filters.bindEvents(this.controller.signal);
  }

  public destroy(): void {
    this.header.destroy();
    this.controller.abort();
    this.games?.destroy();
    this.games = undefined;
  }
}
