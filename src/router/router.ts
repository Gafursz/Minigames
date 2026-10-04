import { getAppPath, normalizeBase, readRoute, withQuery } from './route.ts';
import type { QueryChanges, RouteState } from './route.ts';

export type NavigationReason = 'initial' | 'navigate' | 'history';

export interface RouterEnvironment {
  location: Pick<Location, 'href' | 'origin'>;
  history: Pick<History, 'pushState' | 'replaceState' | 'state'>;
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
}

export class Router {
  private readonly base: string;
  private readonly environment: RouterEnvironment;
  private readonly onChange: (route: RouteState, reason: NavigationReason) => void;
  private started = false;
  private readonly onHistory = (): void => this.publish('history');

  public constructor(
    base: string,
    onChange: (route: RouteState, reason: NavigationReason) => void,
    environment: RouterEnvironment = globalThis,
  ) {
    this.base = normalizeBase(base);
    this.onChange = onChange;
    this.environment = environment;
  }

  private publish(reason: NavigationReason): void {
    const route = this.current;
    if (route.url.href !== this.environment.location.href) {
      this.environment.history.replaceState(this.environment.history.state, '', route.url.href);
    }
    this.onChange(route, reason);
  }

  public get current(): RouteState {
    return readRoute(new URL(this.environment.location.href), this.base);
  }

  public start(): void {
    if (this.started) return;
    this.started = true;
    this.environment.addEventListener('popstate', this.onHistory);
    this.publish('initial');
  }

  public navigate(target: string | URL, shouldReplace = false): boolean {
    let url: URL;
    try {
      url = new URL(target, this.environment.location.href);
    } catch {
      return false;
    }
    if (
      url.origin !== this.environment.location.origin ||
      getAppPath(url, this.base) === undefined
    ) {
      return false;
    }

    const next = readRoute(url, this.base).url;
    if (next.href === this.environment.location.href) return false;
    if (shouldReplace) this.environment.history.replaceState({}, '', next.href);
    else this.environment.history.pushState({}, '', next.href);
    // pushState does not dispatch popstate, so render this navigation explicitly.
    this.publish('navigate');
    return true;
  }

  public updateQuery(changes: QueryChanges, shouldReplace = false): boolean {
    return this.navigate(withQuery(this.current.url, changes), shouldReplace);
  }

  public destroy(): void {
    this.environment.removeEventListener('popstate', this.onHistory);
    this.started = false;
  }
}
