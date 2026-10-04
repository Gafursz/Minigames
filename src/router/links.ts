import { getAppPath, pageHref } from './route.ts';

export function appHref(page: 'home' | 'library'): string {
  return pageHref(page, import.meta.env.BASE_URL);
}

export function isRouterLink(
  anchor: HTMLAnchorElement,
  event: MouseEvent,
  current: URL,
  base: string,
): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.hasAttribute('download') ||
    (anchor.target !== '' && anchor.target !== '_self') ||
    anchor.dataset.routerLink === undefined
  ) {
    return false;
  }

  try {
    const url = new URL(anchor.href, current);
    return url.origin === current.origin && getAppPath(url, base) !== undefined;
  } catch {
    return false;
  }
}
