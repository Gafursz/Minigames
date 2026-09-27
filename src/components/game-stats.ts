import type { Game } from '../types/game';
import { formatLikesCount } from '../utils/game';

export function renderGameStats(game: Pick<Game, 'rating' | 'likesCount'>): string {
  return `
  <div class="game-stats">
  <span class="game-stats__rating">
  <svg
    class="game-stats__meta-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M12 2.5L14.94 8.46L21.52 9.42L16.76 14.06L17.88 20.61L12 17.52L6.12 20.61L7.24 14.06L2.48 9.42L9.06 8.46L12 2.5Z"
      fill="currentColor"
    />
  </svg>
  ${game.rating}
</span>

<span class="game-stats__likes">
  <svg
    class="game-stats__meta-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M12 20.35L10.55 19.03C5.4 14.36 2 11.27 2 7.5C2 4.41 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.08C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.41 22 7.5C22 11.27 18.6 14.36 13.45 19.03L12 20.35Z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </svg>
  ${formatLikesCount(game.likesCount)}
</span>
</div>
  `;
}
