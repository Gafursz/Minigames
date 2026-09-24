import logoIcon from '../assets/icons/logo-icon.svg';

export class Footer {
  public render(): string {
    return `
      <footer class="footer">
        <div class="footer__top">
          <div class="footer__brand">
            <div class="footer__brand-header">
              <a
                class="footer__logo"
                href="/"
                aria-label="MiniGames home"
              >
                <img
                  class="footer__logo-icon"
                  src="${logoIcon}"
                  alt=""
                />

                <span class="footer__logo-text">
                  MiniGames
                </span>
              </a>
            </div>

            <p class="footer__description">
              Take a short break and have fun. Hundreds of curated casual mini-games
              right in your web browser. No download required.
            </p>
          </div>

          <nav
            class="footer__navigation"
            aria-label="Footer navigation"
          >
            <div class="footer__nav-column">
              <h3 class="footer__nav-title">
                Explore
              </h3>

              <ul class="footer__nav-list">
                <li>
                  <a class="footer__nav-link" href="/">
                    Home
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#library">
                    Library
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#categories">
                    Categories
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#tournaments">
                    Tournaments
                  </a>
                </li>
              </ul>
            </div>

            <div class="footer__nav-column">
              <h3 class="footer__nav-title">
                Company
              </h3>

              <ul class="footer__nav-list">
                <li>
                  <a class="footer__nav-link" href="#about">
                    About Us
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#contact">
                    Contact
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#privacy">
                    Privacy Policy
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="#terms">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div class="footer__nav-column footer__nav-column--community">
              <h3 class="footer__nav-title">
                Community
              </h3>
            </div>
          </nav>
        </div>
      </footer>
    `;
  }
}
