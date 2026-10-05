import type { Game } from '../types/game';
import { escapeHtml, getGameCardImage } from '../utils/game';
import { renderGameStats } from './game-stats';

export class LibraryCard {
  public constructor(private readonly game: Game) {}

  public render(): string {
    const name = escapeHtml(this.game.name);
    const category = this.game.category[0].toUpperCase() + this.game.category.slice(1);

    return `
      <article class="library-card">
        <img class="library-card__image" src="${getGameCardImage(this.game.slug)}" alt="${name}" />
        <div class="library-card__content">
          <div class="library-card__heading">
            <h2 class="library-card__title">${name}</h2>
            <span class="library-card__category">${escapeHtml(category)}</span>
          </div>
          <p class="library-card__description">${escapeHtml(this.game.shortDescription)}</p>
          ${renderGameStats(this.game)}
          <span class="library-card__price${this.game.price === 'Free' ? ' library-card__price--free' : ''}">${escapeHtml(this.game.price)}</span>
          <button class="library-card__details" type="button" data-game-details aria-label="Details for ${name}">Details</button>
        </div>
      </article>
    `;
  }
}
