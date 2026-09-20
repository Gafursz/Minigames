export class Hero {
  public render(): string {
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__content">
          <h1 class="hero__title" id="hero-title">
            Take a Short Break<br />
            & Have Fun
          </h1>

          <p class="hero__description">
            Discover hundreds of curated casual mini-games. Play instantly in your browser — puzzle,
            match 3, farm, and board classics.
          </p>

          <a class="hero__button" href="/">
            Browse Library
          </a>
        </div>
      </section>
    `;
  }
}
