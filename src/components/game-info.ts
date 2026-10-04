import gameData from '../data/game-details.json';
import favoriteActiveIcon from '../assets/icons/favorite-heart-active.svg';
import favoriteIcon from '../assets/icons/favorite-heart.svg';
import { escapeHtml } from '../utils/game';
import { renderGameStats } from './game-stats';

export class GameInfo {
  public reset(dialog: HTMLDialogElement): void {
    const button = dialog.querySelector<HTMLButtonElement>('.game-details__favorite');
    const icon = button?.querySelector<HTMLImageElement>('img');
    const label = button?.querySelector<HTMLElement>('.game-details__favorite-label');

    button?.setAttribute('aria-pressed', 'false');
    button?.setAttribute('aria-label', 'Add to Favorites');

    if (icon) {
      icon.src = favoriteIcon;
    }

    if (label) {
      label.textContent = 'Add to Favorites';
    }
  }

  public bindEvents(dialog: HTMLDialogElement): void {
    const button = dialog.querySelector<HTMLButtonElement>('.game-details__favorite');
    button?.addEventListener('click', () => {
      const isFavorite = button.getAttribute('aria-pressed') !== 'true';
      const icon = button.querySelector<HTMLImageElement>('img');
      const label = button.querySelector<HTMLElement>('.game-details__favorite-label');
      const text = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';

      button.setAttribute('aria-pressed', String(isFavorite));
      button.setAttribute('aria-label', text);

      if (icon) {
        icon.src = isFavorite ? favoriteActiveIcon : favoriteIcon;
      }

      if (label) {
        label.textContent = text;
      }
    });
  }

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
