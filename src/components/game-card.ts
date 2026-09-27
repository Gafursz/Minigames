import { renderGameStats } from './game-stats';
import type { Game } from '../types/game';
import { escapeHtml, getGameCardImage } from '../utils/game';

export class GameCard {
  constructor(private readonly game: Game) {}

  public render(): string {
    const imageUrl = getGameCardImage(this.game.slug);
    return `
    <article class="game-card">
      <img
        class="game-card__image"
        src="${imageUrl}"
        alt="${escapeHtml(this.game.name)}"
      />
      <div class="game-card__info">
  <h3 class="game-card__title">${escapeHtml(this.game.name)}</h3>

  ${renderGameStats(this.game)}
</div>
    </article>
  `;
  }
}
