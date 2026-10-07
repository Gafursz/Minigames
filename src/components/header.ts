import { appHref } from '../router/links';
import logoIcon from '../assets/icons/logo-icon.svg';
import { renderHeaderProfile } from './header-profile';
export class Header {
  private controller: AbortController | undefined;

  public constructor(private readonly activePage: 'home' | 'library' | 'not-found' = 'home') {}

  public render(): string {
    const isHome = this.activePage === 'home';
    const isLibrary = this.activePage === 'library';

    return `
        
      <header class="header">
        <nav class="header__nav" aria-label="Main navigation">
          <a class="header__logo" href="${appHref('home')}" data-router-link aria-label="MiniGames home">
          <span class="header__logo-icon-wrapper">
          <img class="header__logo-icon" src="${logoIcon}" alt=""/>
          </span>
          <span class="header__logo-text">
            MiniGames
          </span>
          </a>
          <div class="header__nav-actions">
            <ul class="header__menu">
            <li class="header__menu-item">
              <a class="header__link${isHome ? ' header__link--active' : ''}" href="${appHref('home')}" data-router-link${isHome ? ' aria-current="page"' : ''}>Home</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link${isLibrary ? ' header__link--active' : ''}" href="${appHref('library')}" data-router-link${isLibrary ? ' aria-current="page"' : ''}>Library</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="${appHref('home')}" data-router-link>Tournaments</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="${appHref('home')}" data-router-link>Community</a>
            </li>
          </ul>
          <div class="header__actions">
  ${renderHeaderProfile()}
  <button class="header__login" type="button" data-auth-open="login">
    Login
  </button>

  <button class="header__signup" type="button" data-auth-open="register">
    Sign Up
  </button>

<button
  class="header__burger"
  type="button"
  aria-label="Open navigation menu"
  aria-expanded="false"
  aria-controls="mobile-navigation"
>
  <span class="header__burger-line"></span>
  <span class="header__burger-line"></span>
  <span class="header__burger-line"></span>
</button>
</div>
</div>
        </nav>
        <div
  class="header__mobile-menu"
  id="mobile-navigation"
  hidden 
><div class="header__mobile-top">
  <img class="header__mobile-logo-icon" src="${logoIcon}" alt="" />
  <a
    class="header__mobile-logo"
    href="${appHref('home')}"
    data-router-link
    aria-label="MiniGames home"
  >
    MiniGames
  </a>

  <button
    class="header__mobile-close"
    type="button"
    aria-label="Close navigation menu"
  >
    <span aria-hidden="true">&times;</span>
  </button>
</div>
<ul class="header__mobile-links">
  <li>
    <a class="header__mobile-link${isHome ? ' header__mobile-link--active' : ''}" href="${appHref('home')}" data-router-link${isHome ? ' aria-current="page"' : ''}>Home</a>
  </li>
  <li>
    <a class="header__mobile-link${isLibrary ? ' header__mobile-link--active' : ''}" href="${appHref('library')}" data-router-link${isLibrary ? ' aria-current="page"' : ''}>Library</a>
  </li>
  <li>
    <a class="header__mobile-link" href="${appHref('home')}" data-router-link>Tournaments</a>
  </li>
  <li>
    <a class="header__mobile-link" href="${appHref('home')}" data-router-link>Community</a>
  </li>
</ul>
<div class="header__mobile-actions">
  ${renderHeaderProfile()}
  <button class="header__mobile-login" type="button" data-auth-open="login">
    Log in
  </button>

  <button class="header__mobile-signup" type="button" data-auth-open="register">
    Sign Up
  </button>
</div>
</div>
      </header>
    `;
  }

  public bindEvents(): void {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    for (const profile of document.querySelectorAll('[data-header-profile]')) {
      const photo = profile.querySelector<HTMLImageElement>('[data-profile-photo]');
      const initials = profile.querySelector<HTMLElement>('[data-profile-initials]');
      if (!photo || !initials) continue;
      photo.addEventListener(
        'load',
        () => {
          const hasPhoto = Boolean(photo.getAttribute('src'));
          photo.hidden = !hasPhoto;
          initials.hidden = hasPhoto;
        },
        { signal },
      );
      photo.addEventListener(
        'error',
        () => {
          photo.hidden = true;
          initials.hidden = false;
        },
        { signal },
      );
    }
    const burgerButton = document.querySelector<HTMLButtonElement>('.header__burger');
    const mobileMenu = document.querySelector<HTMLElement>('.header__mobile-menu');
    const closeButton = document.querySelector<HTMLButtonElement>('.header__mobile-close');

    if (!(burgerButton && mobileMenu && closeButton)) {
      return;
    }

    const openMenu = (): void => {
      mobileMenu.hidden = false;
      burgerButton.setAttribute('aria-expanded', 'true');
      globalThis.requestAnimationFrame(() => {
        if (!signal.aborted && burgerButton.getAttribute('aria-expanded') === 'true') {
          mobileMenu.classList.add('header__mobile-menu--open');
        }
      });
    };

    const closeMenu = (): void => {
      mobileMenu.classList.remove('header__mobile-menu--open');
      burgerButton.setAttribute('aria-expanded', 'false');
    };

    burgerButton.addEventListener('click', openMenu, { signal });

    closeButton.addEventListener('click', closeMenu, { signal });
    for (const button of mobileMenu.querySelectorAll<HTMLButtonElement>('[data-auth-open]')) {
      button.addEventListener(
        'click',
        () => {
          closeMenu();
          mobileMenu.hidden = true;
        },
        { signal },
      );
    }

    mobileMenu.addEventListener(
      'transitionend',
      (event) => {
        if (
          event.propertyName !== 'transform' ||
          mobileMenu.classList.contains('header__mobile-menu--open')
        ) {
          return;
        }

        mobileMenu.hidden = true;
      },
      { signal },
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || mobileMenu.hidden) {
          return;
        }

        closeMenu();
        burgerButton.focus();
      },
      { signal },
    );

    for (const link of mobileMenu.querySelectorAll<HTMLAnchorElement>('a')) {
      link.addEventListener('click', closeMenu, { signal });
    }
  }

  public destroy(): void {
    this.controller?.abort();
    this.controller = undefined;
  }
}
