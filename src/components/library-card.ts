import type { ApiGame } from '../types/api';
import { escapeHtml, getApiGameCardImage } from '../utils/game';
import { renderGameStats } from './game-stats';

export class LibraryCard {
  public constructor(private readonly game: ApiGame) {}

  public render(): string {
    const name = escapeHtml(this.game.name);
    const category = this.game.category.charAt(0).toUpperCase() + this.game.category.slice(1);
    const imageUrl = getApiGameCardImage(this.game.cardImage);

    return `
      <article class="library-card">
        ${
          imageUrl
            ? `<img class="library-card__image" src="${escapeHtml(imageUrl)}" alt="${name}" loading="lazy" decoding="async" />`
            : '<div class="library-card__image library-card__image--placeholder" role="img" aria-label="Preview unavailable"><span aria-hidden="true">🎮</span></div>'
        }
        <div class="library-card__content">
          <div class="library-card__heading">
            <h2 class="library-card__title">${name}</h2>
            <span class="library-card__category">${escapeHtml(category)}</span>
          </div>
          <p class="library-card__description">${escapeHtml(this.game.shortDescription)}</p>
          ${renderGameStats(this.game)}
          <span class="library-card__price${this.game.price === 'Free' ? ' library-card__price--free' : ''}">${escapeHtml(this.game.price)}</span>
          <button class="library-card__details" type="button" data-game-details="${escapeHtml(this.game.slug)}" aria-label="Details for ${name}">Details</button>
        </div>
      </article>
    `;
  }
}
