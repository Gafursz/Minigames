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
import { emailAuth } from '../auth/email-auth';
import { signInWithGoogle } from '../auth/google-auth';
import type { AuthProfile, EmailAuth } from '../auth/email-auth';
import { AppSession, APP_SESSION_KEY } from '../auth/app-session';
import type { AuthMode } from '../features/auth-dialog/auth-form';
import type { AuthValues } from '../features/auth-dialog/auth-validation';
import { updateHeaderProfile } from '../components/header-profile';

export class App {
  private readonly root: HTMLElement;
  private page: Page | undefined;
  private pageKey: string | undefined;
  private readonly router: Router;
  private readonly controller = new AbortController();
  private dialogTrigger: HTMLElement | undefined;
  private dialogKey: string | undefined;
  private readonly session: AppSession;
  private pendingAuthUrl: string | undefined;
  private readonly gameDetails = new GameDetails(
    () => this.updateDialogPause(),
    () => {
      this.router.updateQuery({ game: undefined });
    },
    () => Boolean(this.requireSession()),
  );
  private readonly authDialog = new AuthDialog(
    () => this.updateDialogPause(),
    {
      close: () => {
        this.router.updateQuery({ auth: undefined });
      },
      setMode: (mode) => {
        this.router.updateQuery({ auth: mode });
      },
    },
    (mode, values) => this.authenticate(mode, values),
    () => this.completeAuthentication(this.googleAuth),
    (isPending) => {
      if (!isPending) this.queueAuthGuard();
    },
  );

  public constructor(
    root: HTMLElement,
    private readonly auth: EmailAuth = emailAuth,
    private readonly googleAuth: () => Promise<AuthProfile> = signInWithGoogle,
  ) {
    this.root = root;
    this.session = new AppSession(
      () => root.ownerDocument.defaultView?.localStorage,
      () => this.auth.logout(),
      (profile) => {
        updateHeaderProfile(this.root, profile);
        this.gameDetails.setAuthenticated(Boolean(profile));
        if (profile) this.queueAuthGuard();
      },
      () =>
        queueMicrotask(() => {
          if (!this.controller.signal.aborted)
            snackbar.show('Your session expired. Please sign in again.', 'error');
        }),
      () => {
        if (!this.controller.signal.aborted)
          snackbar.show(
            'You are signed out locally, but provider sign-out failed. Please try again later.',
            'error',
          );
      },
    );
    this.router = new Router(
      import.meta.env.BASE_URL,
      (route, reason) => {
        this.renderRoute(route, reason);
      },
      globalThis,
      (url) => this.guardAuthUrl(url),
    );

    this.root.addEventListener(
      'click',
      (event) => {
        if (this.authDialog.isPending) {
          event.preventDefault();
          return;
        }
        if (event.target instanceof Element && event.target.closest('[data-auth-logout]')) {
          this.session.logout();
          snackbar.show('You are signed out.');
          return;
        }
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
        if (trigger?.dataset.gameDetails) {
          this.dialogTrigger = trigger;
          this.router.updateQuery({ game: trigger.dataset.gameDetails, auth: undefined });
          return;
        }
        const authTrigger =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-auth-open]')
            : undefined;
        if (!authTrigger) {
          return;
        }

        this.dialogTrigger = authTrigger;
        this.router.updateQuery({
          auth: authTrigger.dataset.authOpen === 'register' ? 'register' : 'login',
        });
      },
      { signal: this.controller.signal },
    );
    const window = root.ownerDocument.defaultView;
    window?.addEventListener('focus', () => this.session.check(), {
      signal: this.controller.signal,
    });
    window?.addEventListener(
      'storage',
      (event) => {
        if (event.key === APP_SESSION_KEY || event.key === null) this.session.check();
      },
      { signal: this.controller.signal },
    );
    root.ownerDocument.addEventListener(
      'visibilitychange',
      () => {
        if (root.ownerDocument.visibilityState === 'visible') this.session.check();
      },
      { signal: this.controller.signal },
    );
  }

  private queueAuthGuard(): void {
    queueMicrotask(() => {
      if (
        !this.controller.signal.aborted &&
        !this.authDialog.isPending &&
        this.session.current &&
        new URL(globalThis.location.href).searchParams.has('auth')
      )
        this.router.navigate(globalThis.location.href, true);
    });
  }

  private guardAuthUrl(url: URL): URL | undefined {
    const session = this.session.check();
    if (!session || this.authDialog.isPending || !url.searchParams.has('auth')) return undefined;
    url.searchParams.delete('auth');
    queueMicrotask(() => {
      if (!this.controller.signal.aborted) snackbar.show('You are already signed in.');
    });
    return url;
  }

  private async authenticate(mode: AuthMode, values: AuthValues): Promise<void> {
    await this.completeAuthentication(() =>
      mode === 'login'
        ? this.auth.login(values.email, values.password)
        : this.auth.register(values.username, values.email, values.password),
    );
  }

  private async completeAuthentication(operation: () => Promise<AuthProfile>): Promise<void> {
    this.pendingAuthUrl = this.router.current.url.href;
    try {
      this.session.check();
      await this.session.readyForAuthentication();
      const profile = await operation();
      if (this.controller.signal.aborted) {
        await this.auth.logout();
        throw new Error('Authentication view was destroyed.');
      }
      try {
        this.session.establish(profile);
      } catch (error) {
        this.session.logout();
        throw error;
      }
    } finally {
      this.pendingAuthUrl = undefined;
    }
  }

  private updateDialogPause(): void {
    this.page?.setDialogOpen?.(Boolean(this.root.querySelector('dialog[open]')));
  }

  private syncDialogs(route: RouteState): void {
    const dialog = route.dialog;
    const key = dialog
      ? `${dialog.kind}:${dialog.kind === 'game' ? dialog.slug : `${dialog.mode}:${route.url.searchParams.get('game') ?? ''}`}`
      : undefined;
    if (key === this.dialogKey) {
      this.dialogTrigger = undefined;
      return;
    }
    snackbar.dismiss();
    this.dialogKey = key;
    let trigger = this.dialogTrigger;
    this.dialogTrigger = undefined;
    if (!trigger && dialog && !this.root.querySelector('dialog[open]')) {
      trigger = this.root.querySelector<HTMLElement>(':scope main h1') ?? undefined;
      if (trigger) trigger.tabIndex = -1;
    }
    if (dialog?.kind === 'game') {
      this.authDialog.close(false, false);
      this.gameDetails.open(dialog.slug, trigger);
    } else if (dialog?.kind === 'auth') {
      const game = route.url.searchParams.get('game');
      if (game) {
        this.authDialog.close(false, false);
        this.gameDetails.open(game);
        this.gameDetails.suspend();
      } else this.gameDetails.close(false, false);
      this.authDialog.open(dialog.mode, trigger);
    } else {
      this.gameDetails.close();
      this.authDialog.close();
    }
  }

  private renderRoute(route: RouteState, reason: NavigationReason): void {
    this.session.check();
    if (this.authDialog.isPending && this.pendingAuthUrl) {
      const pending = new URL(this.pendingAuthUrl);
      if (
        route.url.pathname !== pending.pathname ||
        route.url.searchParams.get('auth') !== pending.searchParams.get('auth')
      ) {
        this.router.navigate(pending, true);
        return;
      }
      this.pendingAuthUrl = route.url.href;
    }
    const key = route.page === 'not-found' ? route.url.pathname : route.page;
    if (this.page && this.pageKey === key) {
      this.page.updateRoute?.(route);
      this.syncDialogs(route);
      return;
    }

    snackbar.dismiss();
    this.gameDetails.destroy();
    this.authDialog.destroy();
    this.page?.destroy?.();
    this.pageKey = key;
    this.dialogKey = undefined;
    switch (route.page) {
      case 'home': {
        this.page = new HomePage();
        document.title = 'MiniGames — Home';
        break;
      }
      case 'library': {
        this.page = new LibraryPage((changes, shouldReplace) => {
          this.router.updateQuery(changes, shouldReplace);
        });
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
    this.gameDetails.setAuthenticated(Boolean(this.session.current));
    this.authDialog.bindEvents();
    updateHeaderProfile(this.root, this.session.current);
    this.page.updateRoute?.(route);
    this.syncDialogs(route);

    if (reason !== 'initial' && !route.dialog) {
      const heading = this.root.querySelector<HTMLElement>(':scope main h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    if (reason === 'navigate') globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  public requireSession(): AuthProfile | undefined {
    const profile = this.session.check();
    if (profile) return profile;
    this.router.updateQuery({ auth: 'login' });
    return undefined;
  }

  public render(): void {
    this.router.start();
  }

  public destroy(): void {
    this.router.destroy();
    this.controller.abort();
    this.session.destroy();
    snackbar.destroy();
    this.gameDetails.destroy();
    this.authDialog.destroy();
    this.page?.destroy?.();
    this.page = undefined;
    this.pageKey = undefined;
    this.dialogKey = undefined;
    this.dialogTrigger = undefined;
    this.root.replaceChildren();
  }
}
