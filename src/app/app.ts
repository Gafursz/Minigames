import { HomePage } from '../pages/home-page';
import { LibraryPage } from '../pages/library-page';
import type { Page } from '../types/page';

export class App {
  private readonly root: HTMLElement;
  private page: Page | undefined;

  public constructor(root: HTMLElement) {
    this.root = root;

    globalThis.addEventListener('hashchange', () => {
      this.render();
      globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }

  public render(): void {
    this.page?.destroy?.();
    this.page = globalThis.location.hash === '#/library' ? new LibraryPage() : new HomePage();

    this.root.innerHTML = this.page.render();
    this.page.bindEvents();
  }
}
