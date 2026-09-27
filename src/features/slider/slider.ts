import gamesData from '../../data/all-games-seed.json';
import { GameCard } from '../../components/game-card';
import type { Game } from '../../types/game';

import { AutoplayTimer } from './autoplay-timer';
import { getSlideOffset, wrapIndex } from './slider-model';

const featuredGames: Game[] = gamesData.data.filter((game) => game.featured);

export class Slider {
  private readonly games = featuredGames;
  private activeIndex = 0;
  private readonly autoplay = new AutoplayTimer(() => this.step(1));
  private readonly controller = new AbortController();
  private track: HTMLElement | undefined;

  private updateSlides(): void {
    if (!this.track) return;
    const visibleCount = Number(getComputedStyle(this.track).getPropertyValue('--visible-slides'));
    const radius = visibleCount === 3 ? 1 : 2;
    for (const [index, item] of [...this.track.children].entries()) {
      if (!(item instanceof HTMLElement)) continue;
      const offset = getSlideOffset(index, this.activeIndex, this.games.length);
      const isVisible = Math.abs(offset) <= radius;
      item.dataset.slot = String(offset);
      item.inert = !isVisible;
      item.setAttribute('aria-hidden', String(!isVisible));
    }
  }

  private step(direction: number): void {
    this.activeIndex = wrapIndex(this.activeIndex + direction, this.games.length);
    this.updateSlides();
  }

  private manualStep(direction: number): void {
    this.step(direction);
    this.autoplay.reset();
  }

  private renderGameCards(): string {
    return this.games
      .map(
        (game, index) => `
      <div class="slider__item" data-slot="${getSlideOffset(index, this.activeIndex, this.games.length)}">
        ${new GameCard(game).render()}
      </div>
    `,
      )
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

  public bindEvents(): void {
    const track = document.querySelector<HTMLElement>('.slider__track');
    if (!track) return;
    this.track = track;
    const { signal } = this.controller;
    document
      .querySelector('.slider__control--previous')
      ?.addEventListener('click', () => this.manualStep(-1), { signal });
    document
      .querySelector('.slider__control--next')
      ?.addEventListener('click', () => this.manualStep(1), { signal });
    const observer = new ResizeObserver(() => this.updateSlides());
    observer.observe(track);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.autoplay.pause('hidden');
        else this.autoplay.resume('hidden');
      },
      { signal },
    );
    if (document.hidden) this.autoplay.pause('hidden');
    this.updateSlides();
    this.autoplay.start();
  }

  public destroy(): void {
    this.autoplay.destroy();
    this.controller.abort();
    this.track = undefined;
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
