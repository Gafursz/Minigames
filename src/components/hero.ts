import { appHref } from '../router/links';
export class Hero {
  public render(): string {
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__container">
          <div class="hero__content">
            <h1 class="hero__title" id="hero-title">
              Take a Short Break<br />
              & Have Fun
            </h1>

            <p class="hero__description hero__description--desktop">
              Discover hundreds of curated casual mini-games. Play instantly in your browser — puzzle,
              match 3, farm, and board classics.
            </p>

            <p class="hero__description hero__description--mobile">
              Discover hundreds of curated casual mini-games right in your browser.
            </p>

            <a class="hero__button" href="${appHref('library')}" data-router-link>
              Browse Library
            </a>
          </div>
        </div>
      </section>
    `;
  }
}
