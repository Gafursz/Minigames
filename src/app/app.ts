import { HomePage } from '../pages/home-page';
import { LibraryPage } from '../pages/library-page';
import type { Page } from '../types/page';
import { GameDetails } from '../features/game-details/game-details';

export class App {
  private readonly root: HTMLElement;
  private page: Page | undefined;
  private readonly gameDetails = new GameDetails();

  public constructor(root: HTMLElement) {
    this.root = root;

    this.root.addEventListener('click', (event) => {
      const trigger =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-game-details]')
          : undefined;
      if (trigger) this.gameDetails.open(trigger);
    });

    globalThis.addEventListener('hashchange', () => {
      this.render();
      globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }

  public render(): void {
    this.gameDetails.destroy();
    this.page?.destroy?.();
    this.page = globalThis.location.hash === '#/library' ? new LibraryPage() : new HomePage();

    this.root.innerHTML = `${this.page.render()}${this.gameDetails.render()}`;
    this.page.bindEvents();
    this.gameDetails.bindEvents();
  }
}
