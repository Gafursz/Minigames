export class Header {
  public render(): string {
    return `
        
      <header class="header">
        <nav class="header__nav" aria-label="Main navigation">
          <a class="header__logo" href="/" aria-label="MiniGames home">
            MiniGames
          </a>
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
            <ul class="header__menu">
            <li class="header__menu-item">
              <a class="header__link header__link--active" href="/">Home</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="/">Library</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="/">Tournaments</a>
            </li>
            <li class="header__menu-item">
              <a class="header__link" href="/">Community</a>
            </li>
          </ul>
          <div class="header__actions">
  <button class="header__login" type="button">
    Login
  </button>

  <button class="header__signup" type="button">
    Sign Up
  </button>
</div>
        </nav>
        <div
  class="header__mobile-menu"
  id="mobile-navigation"
  hidden 
><div class="header__mobile-top">
  <a class="header__mobile-logo" href="/" aria-label="MiniGames home">
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
    <a class="header__mobile-link header__mobile-link--active" href="/">Home</a>
  </li>
  <li>
    <a class="header__mobile-link" href="/">Library</a>
  </li>
  <li>
    <a class="header__mobile-link" href="/">Tournaments</a>
  </li>
  <li>
    <a class="header__mobile-link" href="/">Community</a>
  </li>
</ul>
</div>
      </header>
    `;
  }
  public bindEvents(): void {
    const burgerButton = document.querySelector<HTMLButtonElement>('.header__burger');
    const mobileMenu = document.querySelector<HTMLElement>('.header__mobile-menu');
    const closeButton = document.querySelector<HTMLButtonElement>('.header__mobile-close');
    if (burgerButton && mobileMenu && closeButton) {
      burgerButton.addEventListener('click', () => {
        mobileMenu.hidden = false;
        burgerButton.setAttribute('aria-expanded', 'true');
      });
      closeButton.addEventListener('click', () => {
        mobileMenu.hidden = true;
        burgerButton.setAttribute('aria-expanded', 'false');
      });
    }
  }
}
