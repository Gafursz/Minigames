const gameImages = import.meta.glob('../assets/images/games/*-card.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export function getGameCardImage(slug: string): string {
  return gameImages[`../assets/images/games/${slug}-card.jpg`];
}

export function formatLikesCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
}

export { escapeHtml } from './html.ts';
