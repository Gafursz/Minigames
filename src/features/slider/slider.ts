import gamesData from '../../data/all-games-seed.json';
import { GameCard } from '../../components/game-card';
import type { Game } from '../../types/game';

export class Slider {
  private readonly games: Game[] = gamesData.data;
  public render(): string {
    const visibleGameSlugs = [
      'shelve-the-potions',
      'islanders-new-shores',
      'vacation-cafe-simulator',
      'winter-burrow',
      'heartopia',
    ];

    const visibleGames = visibleGameSlugs
      .map((slug) => this.games.find((game) => game.slug === slug))
      .filter((game): game is Game => game !== undefined);

    const gameCards = visibleGames
      .map((game, index) => {
        let variant = 'desktop-narrow';
        if (index === 1 || index === 3) {
          variant = 'responsive-narrow';
        } else if (index === 2) {
          variant = 'featured';
        }

        return `
      <div class="slider__item slider__item--${variant}">
        ${new GameCard(game).render()}
      </div>
    `;
      })
      .join('');

    return `
         <section class="slider" aria-labelledby="new-games-title">
         <div class="slider__header">
  <h2 class="slider__title" id="new-games-title">
    <span class="slider__title-accent" aria-hidden="true"></span>
    New Games
  </h2>

  <div class="slider__controls">
    <button
      class="slider__control slider__control--previous"
      type="button"
      aria-label="Previous games"
    >
      <svg
  class="slider__control-icon"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    d="M19 12H5M11 18L5 12L11 6"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
    </button>

    <button
      class="slider__control slider__control--next"
      type="button"
      aria-label="Next games"
    >
      <svg
  class="slider__control-icon"
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path
    d="M5 12H19M13 6L19 12L13 18"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
    </button>
  </div>
</div>
<div class="slider__track">${gameCards}</div>
        </section>`;
  }
}
