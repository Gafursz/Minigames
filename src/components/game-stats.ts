import type { Game } from '../types/game';
import { formatLikesCount } from '../utils/game';
import starIcon from '../assets/icons/rating-star.svg';
import heartIcon from '../assets/icons/likes-heart.svg';

export function renderGameStats(game: Pick<Game, 'rating' | 'likesCount'>): string {
  return `
    <div class="game-stats">
      <span class="game-stats__rating">
        <span class="game-stats__meta-icon"><img src="${starIcon}" alt="" /></span>
        <span class="visually-hidden">Rating: </span>${game.rating}
      </span>
      <span class="game-stats__likes">
        <span class="game-stats__meta-icon"><img src="${heartIcon}" alt="" /></span>
        <span class="visually-hidden">Likes: </span>${formatLikesCount(game.likesCount)}
      </span>
    </div>
  `;
}
