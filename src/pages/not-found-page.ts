import notFoundImage from '../assets/images/404-error.png';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { appHref } from '../router/links';

export class NotFoundPage {
  private readonly header = new Header('not-found');
  private readonly footer = new Footer();

  public render(): string {
    return `
      ${this.header.render()}
      <main class="not-found" aria-labelledby="not-found-title">
        <div class="not-found__content">
          <img class="not-found__image" src="${notFoundImage}" alt="" aria-hidden="true"/>
          <h1 class="not-found__title" id="not-found-title">Page not found</h1>
          <p class="not-found__message">The page you are looking for does not exist. Head home to discover a game to play.</p>
          <a class="not-found__link" href="${appHref('home')}" data-router-link>Return to Home Page</a>
        </div>
      </main>
      ${this.footer.render()}
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
  }

  public destroy(): void {
    this.header.destroy();
  }
}
