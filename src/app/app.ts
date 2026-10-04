import { HomePage } from '../pages/home-page';
import { LibraryPage } from '../pages/library-page';
import type { Page } from '../types/page';
import { AuthDialog } from '../features/auth-dialog/auth-dialog';
import { GameDetails } from '../features/game-details/game-details';
import { NotFoundPage } from '../pages/not-found-page';
import { Router } from '../router/router';
import type { NavigationReason } from '../router/router';
import type { RouteState } from '../router/route';
import { isRouterLink } from '../router/links';
import { snackbar } from '../components/snackbar';

export class App {
  private readonly root: HTMLElement;
  private page: Page | undefined;
  private pageKey: string | undefined;
  private readonly router: Router;
  private readonly controller = new AbortController();
  private readonly gameDetails = new GameDetails((isOpen) => {
    this.page?.setDialogOpen?.(isOpen);
  });

  private readonly authDialog = new AuthDialog((isOpen) => {
    this.page?.setDialogOpen?.(isOpen);
  });

  public constructor(root: HTMLElement) {
    this.root = root;
    this.router = new Router(import.meta.env.BASE_URL, (route, reason) => {
      this.renderRoute(route, reason);
    });

    this.root.addEventListener(
      'click',
      (event) => {
        const link =
          event.target instanceof Element
            ? event.target.closest<HTMLAnchorElement>('a[data-router-link]')
            : undefined;
        if (
          link &&
          isRouterLink(link, event, new URL(globalThis.location.href), import.meta.env.BASE_URL)
        ) {
          event.preventDefault();
          this.router.navigate(link.href);
          return;
        }
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
      },
      { signal: this.controller.signal },
    );
  }

  private renderRoute(route: RouteState, reason: NavigationReason): void {
    const key = route.page === 'not-found' ? route.url.pathname : route.page;
    if (this.page && this.pageKey === key) {
      this.page.updateRoute?.(route);
      return;
    }

    snackbar.dismiss();
    this.gameDetails.destroy();
    this.authDialog.destroy();
    this.page?.destroy?.();
    this.pageKey = key;
    switch (route.page) {
      case 'home': {
        this.page = new HomePage();
        document.title = 'MiniGames — Home';
        break;
      }
      case 'library': {
        this.page = new LibraryPage();
        document.title = 'MiniGames — Library';
        break;
      }
      default: {
        this.page = new NotFoundPage();
        document.title = 'MiniGames — Page not found';
      }
    }

    this.root.innerHTML = `${this.page.render()}${this.gameDetails.render()}${this.authDialog.render()}`;
    this.page.bindEvents();
    this.gameDetails.bindEvents();
    this.authDialog.bindEvents();
    this.page.updateRoute?.(route);

    if (reason !== 'initial') {
      const heading = this.root.querySelector<HTMLElement>(':scope main h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    if (reason === 'navigate') globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  public render(): void {
    this.router.start();
  }

  public destroy(): void {
    this.router.destroy();
    this.controller.abort();
    snackbar.destroy();
    this.gameDetails.destroy();
    this.authDialog.destroy();
    this.page?.destroy?.();
    this.page = undefined;
    this.pageKey = undefined;
    this.root.replaceChildren();
  }
}
