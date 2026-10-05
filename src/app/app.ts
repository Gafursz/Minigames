import { HomePage } from '../pages/home-page';
import { LibraryPage } from '../pages/library-page';
import type { Page } from '../types/page';
import { AuthDialog } from '../features/auth-dialog/auth-dialog';
import { GameDetails } from '../features/game-details/game-details';

export class App {
  private readonly root: HTMLElement;
  private page: Page | undefined;
  private readonly gameDetails = new GameDetails((isOpen) => {
    this.page?.setDialogOpen?.(isOpen);
  });

  private readonly authDialog = new AuthDialog((isOpen) => {
    this.page?.setDialogOpen?.(isOpen);
  });

  public constructor(root: HTMLElement) {
    this.root = root;

    this.root.addEventListener('click', (event) => {
      const trigger =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-game-details]')
          : undefined;
      if (trigger && !this.root.querySelector('dialog[open]')) this.gameDetails.open(trigger);
      const authTrigger =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-auth-open]')
          : undefined;
      if (authTrigger)
        this.authDialog.open(
          authTrigger.dataset.authOpen === 'register' ? 'register' : 'login',
          authTrigger,
        );
    });

    globalThis.addEventListener('hashchange', () => {
      this.render();
      globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }

  public render(): void {
    this.gameDetails.destroy();
    this.authDialog.destroy();
    this.page?.destroy?.();
    this.page = globalThis.location.hash === '#/library' ? new LibraryPage() : new HomePage();

    this.root.innerHTML = `${this.page.render()}${this.gameDetails.render()}${this.authDialog.render()}`;
    this.page.bindEvents();
    this.gameDetails.bindEvents();
    this.authDialog.bindEvents();
  }
}
