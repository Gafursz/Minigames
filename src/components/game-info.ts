import { t, translateKnown } from '../utils/text';
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
          [t('Genre'), game.specs.genre],
          [t('Players'), game.specs.players],
          [t('Duration'), game.specs.duration],
          [t('Price'), game.specs.price],
        ]
          .map(
            ([key, value]) => `
          <div class="game-details__spec">
            <dt>${key}</dt>
            <dd>${escapeHtml(translateKnown(value))}</dd>
          </div>
        `,
          )
          .join('')}
      </dl>
      <div class="game-details__actions">
        <button class="game-details__play" type="button" disabled title="${t('Game launching is not available yet')}">${t('Play Now')}</button>
        <button class="game-details__favorite" type="button" ${hasGuard ? '' : 'disabled'} title="${t('Sign in to add favorites')}" aria-pressed="false" aria-label="${t('Add to Favorites')}">
          <img src="${favoriteIcon}" alt="" />
          <span class="game-details__favorite-label">${t('Add to Favorites')}</span>
        </button>
      </div>
    `;
  }
}
