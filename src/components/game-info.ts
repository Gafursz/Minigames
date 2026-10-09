import type { GameDetailsData } from '../types/api';
import favoriteIcon from '../assets/icons/favorite-heart.svg';
import { escapeHtml } from '../utils/game';
import { renderGameStats } from './game-stats';

export class GameInfo {
  public render(game: GameDetailsData, hasGuard = false): string {
    return `
      <div class="game-details__heading">
        <h2 class="game-details__title" id="game-info-title">${escapeHtml(game.name)}</h2>
        ${renderGameStats(game)}
      </div>
      <p class="game-details__description">${escapeHtml(game.fullDescription)}</p>
      <dl class="game-details__specs">
        ${[
          ['Genre', game.specs.genre],
          ['Players', game.specs.players],
          ['Duration', game.specs.duration],
          ['Price', game.specs.price],
        ]
          .map(
            ([key, value]) => `
          <div class="game-details__spec">
            <dt>${key}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `,
          )
          .join('')}
      </dl>
      <div class="game-details__actions">
        <button class="game-details__play" type="button" disabled title="Game launching is not available yet">Play Now</button>
        <button class="game-details__favorite" type="button" ${hasGuard ? '' : 'disabled'} title="Sign in to add favorites" aria-pressed="false" aria-label="Add to Favorites">
          <img src="${favoriteIcon}" alt="" />
          <span class="game-details__favorite-label">Add to Favorites</span>
        </button>
      </div>
    `;
  }
}
