import developerIllustration from '../assets/images/developer/developer-illustration.png';

export class DeveloperSection {
  public render(): string {
    return `
      <section
        class="developer-section"
        aria-labelledby="developer-section-title"
      >
        <div class="developer-section__illustration">
          <img
            class="developer-section__image"
            src="${developerIllustration}"
            alt=""
          />
        </div>

        <div class="developer-section__card">
          <h2
            class="developer-section__title"
            id="developer-section-title"
          >
            Are You a Game Developer?
          </h2>

          <p class="developer-section__description">
  Want to see your game on MiniGames? We're always looking for fun,
  engaging mini games to add to our platform. Submit your game
  and reach thousands of players!
</p>

          <a
  class="developer-section__button"
  href="#submit-game"
>
  Submit Here
</a>

<p class="developer-section__contact">
  or contact us at
  <a
    class="developer-section__email"
    href="mailto:hello@minigames.com"
  >
    hello@minigames.com
  </a>
</p>
        </div>
      </section>
    `;
  }
}
