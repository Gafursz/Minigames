import { HomePage } from '../pages/home-page';
import { LibraryPage } from '../pages/library-page';

export class App {
  private readonly root: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;

    globalThis.addEventListener('hashchange', () => {
      this.render();
      globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }

  public render(): void {
    const page = globalThis.location.hash === '#/library' ? new LibraryPage() : new HomePage();

    this.root.innerHTML = page.render();
    page.bindEvents();
  }
}
