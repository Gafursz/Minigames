import unableLoadGamesImage from '../../assets/images/unable_load_games.png';

import { getFeaturedGames } from '../../api/minigames-api';

import { GameCard } from '../../components/game-card';

import type { ApiGame, FeaturedGamesResponse } from '../../types/api';

import { HomeResource, hasNoItems } from '../home/home-resource';

import { bindSliderGestures } from './slider-gestures';

import { AutoplayTimer } from './autoplay-timer';

import { getSlideOffset, wrapIndex } from './slider-model';

export class Slider {
  private games: ApiGame[] = [];
  private activeIndex = 0;
  private autoplay: AutoplayTimer | undefined;
  private controller: AbortController | undefined;
  private resource: HomeResource<FeaturedGamesResponse> | undefined;
  private root: HTMLElement | undefined;
  private track: HTMLElement | undefined;
  private isDialogOpen = false;

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
    if (this.games.length < 2) return;
    this.activeIndex = wrapIndex(this.activeIndex + direction, this.games.length);
    this.updateSlides();
  }

  private manualStep(direction: number): void {
    this.step(direction);
    this.autoplay?.reset();
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
          disabled
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
          disabled
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

  private clearSlides(): void {
    this.autoplay?.destroy();
    this.autoplay = undefined;
    this.controller?.abort();
    this.controller = undefined;
    this.track = undefined;
    this.games = [];
    this.activeIndex = 0;
    this.setControlsDisabled(true);
  }

  private setControlsDisabled(isDisabled: boolean): void {
    const controls = this.root?.querySelectorAll<HTMLButtonElement>('.slider__control') ?? [];
    for (const button of controls) {
      button.disabled = isDisabled;
    }
  }

  private bindSlides(): void {
    const track = this.root?.querySelector<HTMLElement>('.slider__track');
    if (!track) return;
    this.track = track;
    this.updateSlides();
    if (this.games.length < 2) return;
    this.setControlsDisabled(false);
    this.autoplay = new AutoplayTimer(() => this.step(1));
    this.controller = new AbortController();
    const { signal } = this.controller;
    bindSliderGestures(
      track,
      {
        onHold: () => this.autoplay?.pause('pointer'),
        onRelease: () => this.autoplay?.resume('pointer'),
        onSwipe: (direction) => this.manualStep(direction),
      },
      signal,
    );
    this.root
      ?.querySelector('.slider__control--previous')
      ?.addEventListener('click', () => this.manualStep(-1), { signal });
    this.root
      ?.querySelector('.slider__control--next')
      ?.addEventListener('click', () => this.manualStep(1), { signal });
    const observer = new ResizeObserver(() => this.updateSlides());
    observer.observe(track);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.autoplay?.pause('hidden');
        else this.autoplay?.resume('hidden');
      },
      { signal },
    );
    if (document.hidden) this.autoplay.pause('hidden');
    if (this.isDialogOpen) this.autoplay.pause('dialog');
    this.autoplay.start();
  }

  public bindEvents(): void {
    this.resource?.destroy();
    this.root = document.querySelector<HTMLElement>('.slider') ?? undefined;
    const content = this.root?.querySelector<HTMLElement>('.slider__content');
    if (!content) return;
    this.resource = new HomeResource(content, {
      request: getFeaturedGames,
      isEmpty: hasNoItems,
      layout: 'slider',
      label: 'Featured games',
      emptyMessage: 'No featured games to show right now. Check back later.',
      errorImageSrc: unableLoadGamesImage,
      render: (response) => {
        this.games = response.data;
        return `<div class="slider__track">${this.renderGameCards()}</div>`;
      },
      onClear: () => this.clearSlides(),

      onReady: () => this.bindSlides(),
    });
    void this.resource.load();
  }

  public setDialogOpen(isOpen: boolean): void {
    this.isDialogOpen = isOpen;
    if (isOpen) this.autoplay?.pause('dialog');
    else this.autoplay?.resume('dialog');
  }

  public destroy(): void {
    this.resource?.destroy();
    this.resource = undefined;
    this.clearSlides();
    this.root = undefined;
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

          <div class="slider__content" aria-busy="true"></div>
        </div>
      </section>
    `;
  }
}
