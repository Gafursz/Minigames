const gameImages = import.meta.glob('../assets/images/games/*-card.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

import type { Game } from '../types/Game';
export class GameCard {
  constructor(private readonly game: Game) {}
  private formatLikesCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }

    return count.toString();
  }

  public render(): string {
    const imagePath = `../assets/images/games/${this.game.slug}-card.jpg`;
    const imageUrl = gameImages[imagePath];
    return `
    <article class="game-card">
      <img
        class="game-card__image"
        src="${imageUrl}"
        alt="${this.game.name}"
      />
      <div class="game-card__info">
  <h3 class="game-card__title">${this.game.name}</h3>

  <div class="game-card__meta">
  <span class="game-card__rating">
  <svg
    class="game-card__meta-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M12 2.5L14.94 8.46L21.52 9.42L16.76 14.06L17.88 20.61L12 17.52L6.12 20.61L7.24 14.06L2.48 9.42L9.06 8.46L12 2.5Z"
      fill="currentColor"
    />
  </svg>
  ${this.game.rating}
</span>

<span class="game-card__likes">
  <svg
    class="game-card__meta-icon"
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
  ${this.formatLikesCount(this.game.likesCount)}
</span>
</div>
</div>
    </article>
  `;
  }
}
