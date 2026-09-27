import gameData from '../data/game-details.json';
import favoriteIcon from '../assets/icons/favorite-heart.svg';
import { escapeHtml } from '../utils/game';
import { renderGameStats } from './game-stats';

export class GameInfo {
  public render(): string {
    const game = gameData.data;
    return `
      <div class="game-details__heading">
        <h2 class="game-details__title" id="game-details-title">${escapeHtml(game.name)}</h2>
        ${renderGameStats(game)}
      </div>
      <p class="game-details__description">${escapeHtml(game.fullDescription)}</p>
      <dl class="game-details__specs">
        ${Object.entries(game.specs)
          .map(
            ([key, value]) => `
          <div class="game-details__spec">
            <dt>${key[0].toUpperCase() + key.slice(1)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `,
          )
          .join('')}
      </dl>
      <div class="game-details__actions">
        <button class="game-details__play" type="button">Play Now</button>
        <button class="game-details__favorite" type="button" aria-pressed="false" aria-label="Add to Favorites">
          <img src="${favoriteIcon}" alt="" />
          <span class="game-details__favorite-label">Add to Favorites</span>
        </button>
      </div>
    `;
  }
}
