import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { LibraryCard } from '../components/library-card';
import gamesData from '../data/all-games-seed.json';

export class LibraryPage {
  private readonly header = new Header('library');
  private readonly footer = new Footer();

  public render(): string {
    return `
      ${this.header.render()}

      <main class="library">
        <section class="library__intro" aria-labelledby="library-title">
          <h1 class="library__title" id="library-title">Game Library</h1>
          <p class="library__description">Browse our collection of casual mini-games</p>
        </section>
        <section class="library__cards" aria-label="Games">
          ${gamesData.data
            .slice(0, 6)
            .map((game) => new LibraryCard(game).render())
            .join('')}
        </section>
      </main>

      ${this.footer.render()}
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
  }
}
