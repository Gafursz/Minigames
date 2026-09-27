import logoIcon from '../assets/icons/logo-icon.svg';
export class Header {
  public constructor(private readonly activePage: 'home' | 'library' = 'home') {}

  public render(): string {
    const isHome = this.activePage === 'home';
    const isLibrary = this.activePage === 'library';

    return `
        
      <header class="header">
        <nav class="header__nav" aria-label="Main navigation">
          <a class="header__logo" href="#/" aria-label="MiniGames home">
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
              <a class="header__link${isHome ? ' header__link--active' : ''}" href="#/"${isHome ? ' aria-current="page"' : ''}>Home</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link${isLibrary ? ' header__link--active' : ''}" href="#/library"${isLibrary ? ' aria-current="page"' : ''}>Library</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="#/">Tournaments</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="#/">Community</a>
            </li>
          </ul>
          <div class="header__actions">
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
  <a class="header__mobile-logo" href="#/" aria-label="MiniGames home">
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
    <a class="header__mobile-link${isHome ? ' header__mobile-link--active' : ''}" href="#/"${isHome ? ' aria-current="page"' : ''}>Home</a>
  </li>
  <li>
    <a class="header__mobile-link${isLibrary ? ' header__mobile-link--active' : ''}" href="#/library"${isLibrary ? ' aria-current="page"' : ''}>Library</a>
  </li>
  <li>
    <a class="header__mobile-link" href="#/">Tournaments</a>
  </li>
  <li>
    <a class="header__mobile-link" href="#/">Community</a>
  </li>
</ul>
<div class="header__mobile-actions">
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
    const burgerButton = document.querySelector<HTMLButtonElement>('.header__burger');
    const mobileMenu = document.querySelector<HTMLElement>('.header__mobile-menu');
    const closeButton = document.querySelector<HTMLButtonElement>('.header__mobile-close');

    if (!(burgerButton && mobileMenu && closeButton)) {
      return;
    }

    const openMenu = (): void => {
      mobileMenu.hidden = false;

      requestAnimationFrame(() => {
        mobileMenu.classList.add('header__mobile-menu--open');
      });

      burgerButton.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = (): void => {
      mobileMenu.classList.remove('header__mobile-menu--open');
      burgerButton.setAttribute('aria-expanded', 'false');
    };

    burgerButton.addEventListener('click', openMenu);

    closeButton.addEventListener('click', closeMenu);
    for (const button of mobileMenu.querySelectorAll<HTMLButtonElement>('[data-auth-open]')) {
      button.addEventListener('click', closeMenu);
    }

    mobileMenu.addEventListener('transitionend', (event) => {
      if (
        event.propertyName !== 'transform' ||
        mobileMenu.classList.contains('header__mobile-menu--open')
      ) {
        return;
      }

      mobileMenu.hidden = true;
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || mobileMenu.hidden) {
        return;
      }

      closeMenu();
      burgerButton.focus();
    });

    for (const link of mobileMenu.querySelectorAll<HTMLAnchorElement>('a')) {
      link.addEventListener('click', closeMenu);
    }
  }
}
