import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { LibraryCard } from '../components/library-card';
import gamesData from '../data/all-games-seed.json';
import { LibraryFilters } from '../components/library-filters';
import { Pagination } from '../components/pagination';

export class LibraryPage {
  private readonly header = new Header('library');
  private readonly footer = new Footer();
  private readonly controller = new AbortController();
  private readonly filters = new LibraryFilters();
  private readonly pagination = new Pagination();

  public render(): string {
    return `
      ${this.header.render()}

      <main class="library">
        <section class="library__intro" aria-labelledby="library-title">
          <h1 class="library__title" id="library-title">Game Library</h1>
          <p class="library__description">Browse our collection of casual mini-games</p>
        </section>
        ${this.filters.render()}
        <section class="library__cards" aria-label="Games">
          ${gamesData.data
            .slice(0, 6)
            .map((game) => new LibraryCard(game).render())
            .join('')}
        </section>
        ${this.pagination.render()}
      </main>

      ${this.footer.render()}
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
    this.filters.bindEvents(this.controller.signal);
    this.pagination.bindEvents(this.controller.signal);
  }

  public destroy(): void {
    this.controller.abort();
  }
}
