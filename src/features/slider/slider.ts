import gamesData from '../../data/all-games-seed.json';
import { GameCard } from '../../components/game-card';
import type { Game } from '../../types/game';

type SlidePosition = 'far-prev' | 'prev' | 'active' | 'next' | 'far-next';

export class Slider {
  private readonly games: Game[] = gamesData.data;

  private readonly visibleGameSlugs: string[] = [
    'shelve-the-potions',
    'islanders-new-shores',
    'vacation-cafe-simulator',
    'winter-burrow',
    'heartopia',
  ];

  private readonly slidePositions: SlidePosition[] = [
    'far-prev',
    'prev',
    'active',
    'next',
    'far-next',
  ];

  private getVisibleGames(): Game[] {
    return this.visibleGameSlugs
      .map((slug: string) => this.games.find((game: Game) => game.slug === slug))
      .filter((game: Game | undefined): game is Game => game !== undefined);
  }

  private renderGameCards(): string {
    return this.getVisibleGames()
      .map((game: Game, index: number) => {
        const position: SlidePosition | undefined = this.slidePositions[index];

        if (position === undefined) {
          return '';
        }

        return `
          <div class="slider__item slider__item--${position}">
            ${new GameCard(game).render()}
          </div>
        `;
      })
      .join('');
  }

  private renderControls(): string {
    return `
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
    `;
  }

  public render(): string {
    return `
      <section class="slider" aria-labelledby="new-games-title">
        <div class="slider__container">
          <div class="slider__header">
            <h2 class="slider__title" id="new-games-title">
              <span
                class="slider__title-accent"
                aria-hidden="true"
              ></span>
              New Games
            </h2>

            ${this.renderControls()}
          </div>

          <div class="slider__track">
            ${this.renderGameCards()}
          </div>
        </div>
      </section>
    `;
  }
}
