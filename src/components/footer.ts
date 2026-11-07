import { t } from '../utils/text';
import { appHref } from '../router/links';
import chatIcon from '../assets/icons/footer-chat.svg';
import rssIcon from '../assets/icons/footer-rss.svg';
import schoolIcon from '../assets/icons/footer-school.svg';
import shareIcon from '../assets/icons/footer-share.svg';
import logoIcon from '../assets/icons/logo-icon.svg';
import developerIcon from '../assets/icons/footer_developer_icon.svg';

export class Footer {
  public render(): string {
    return `
      <footer class="footer">
        <div class="footer__top">
          <div class="footer__about">
            <a
              class="footer__logo"
              href="${appHref('home')}" data-router-link
              aria-label="${t('MiniGames home')}"
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

            <p class="footer__description">
              ${t('Take a short break and have fun. Hundreds of curated casual mini-games right in your web browser. No download required.')}
            </p>
          </div>

          <nav
            class="footer__navigation"
            aria-label="${t('Footer navigation')}"
          >
            <div class="footer__nav-column">
              <h3 class="footer__nav-title">
                ${t('Explore')}
              </h3>

              <ul class="footer__nav-list">
                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Home')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('library')}" data-router-link>
                    ${t('Library')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Categories')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Tournaments')}
                  </a>
                </li>
              </ul>
            </div>

            <div class="footer__nav-column">
              <h3 class="footer__nav-title">
                ${t('Company')}
              </h3>

              <ul class="footer__nav-list">
                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('About Us')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Contact')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Privacy Policy')}
                  </a>
                </li>

                <li>
                  <a class="footer__nav-link" href="${appHref('home')}" data-router-link>
                    ${t('Terms of Service')}
                  </a>
                </li>
              </ul>
            </div>

            <div class="footer__community">
              <h3 class="footer__nav-title">
                ${t('Community')}
              </h3>

              <div class="footer__socials">
                <a
                  class="footer__social-link"
                  href="${appHref('home')}" data-router-link
                  aria-label="${t('Share MiniGames')}"
                >
                  <img
                    class="footer__social-icon"
                    src="${shareIcon}"
                    alt=""
                  />
                </a>

                <a
                  class="footer__social-link"
                  href="${appHref('home')}" data-router-link
                  aria-label="${t('MiniGames community')}"
                >
                  <img
                    class="footer__social-icon"
                    src="${chatIcon}"
                    alt=""
                  />
                </a>

                <a
                  class="footer__social-link"
                  href="${appHref('home')}" data-router-link
                  aria-label="${t('MiniGames RSS feed')}"
                >
                  <img
                    class="footer__social-icon"
                    src="${rssIcon}"
                    alt=""
                  />
                </a>
              </div>
            </div>
          </nav>
        </div>

        <div class="footer__bottom">
          <p class="footer__copyright">
            ${t('© 2026 MiniGames. All rights reserved.')}
          </p>

          <a
            class="footer__credit"
            href="https://rs.school/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              class="footer__school-icon"
              src="${schoolIcon}"
              alt=""
            />

            <span>RS School</span>
          </a>

          <a
            class="footer__credit"
            href="https://github.com/Gafursz"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img class="footer__developer-icon" src="${developerIcon}" alt="" />
            @Gafursz
          </a>

          <span class="footer__designed">
            ${t('Designed with love')}
          </span>
        </div>
      </footer>
    `;
  }
}
