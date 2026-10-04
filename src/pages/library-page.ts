import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { LibraryFilters } from '../components/library-filters';
import { Pagination } from '../components/pagination';
import { LibraryGames } from '../features/library/library-games';

export class LibraryPage {
  private readonly header = new Header('library');
  private readonly footer = new Footer();
  private readonly controller = new AbortController();
  private readonly filters = new LibraryFilters();
  private readonly pagination = new Pagination();
  private games: LibraryGames | undefined;

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
    this.filters.bindEvents(this.controller.signal);
    this.pagination.bindEvents(this.controller.signal);
    const cards = document.querySelector<HTMLElement>('.library__cards');
    if (!cards) return;
    this.games?.destroy();
    this.games = new LibraryGames(cards);
    void this.games.load();
  }

  public destroy(): void {
    this.header.destroy();
    this.controller.abort();
    this.games?.destroy();
    this.games = undefined;
  }
}
