import type { Game } from '../types/game';
import { escapeHtml, formatLikesCount } from '../utils/game';
import starIcon from '../assets/icons/rating-star.svg';
import heartIcon from '../assets/icons/likes-heart.svg';

export function renderGameStats(game: Pick<Game, 'rating' | 'likesCount'>): string {
  return `
    <div class="game-stats">
      <span class="game-stats__rating">
        <span class="game-stats__meta-icon"><img src="${starIcon}" alt="" /></span>
        <span class="visually-hidden">Rating: </span>${escapeHtml(String(game.rating))}
      </span>
      <span class="game-stats__likes">
        <span class="game-stats__meta-icon"><img src="${heartIcon}" alt="" /></span>
        <span class="visually-hidden">Likes: </span><span data-game-likes-count>${escapeHtml(formatLikesCount(game.likesCount))}</span>
      </span>
    </div>
  `;
}
