import { renderGameStats } from './game-stats';
import type { ApiGame } from '../types/api';
import { escapeHtml, getApiGameCardImage } from '../utils/game';

export class GameCard {
  constructor(private readonly game: ApiGame) {}

  public render(): string {
    const imageUrl = getApiGameCardImage(this.game.cardImage);
    return `
    <article class="game-card">
      ${
        imageUrl
          ? `<img
        class="game-card__image"
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(this.game.name)}"
        draggable="false"
      />`
          : '<span class="game-card__placeholder" aria-hidden="true">🎮</span>'
      }
      <div class="game-card__info">
  <h3 class="game-card__title">${escapeHtml(this.game.name)}</h3>

  ${renderGameStats(this.game)}
</div>
      <button class="game-card__trigger" type="button" data-game-details="${escapeHtml(this.game.slug)}" aria-label="Details for ${escapeHtml(this.game.name)}"></button>
    </article>
  `;
  }
}
