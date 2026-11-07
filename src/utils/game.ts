const gameImages = import.meta.glob('../assets/images/games/*-card.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export function getGameCardImage(slug: string): string {
  return gameImages[`../assets/images/games/${slug}-card.jpg`];
}

// The API uses repository asset paths; Vite publishes those files under hashed URLs.
export function getApiGameCardImage(path: string): string | undefined {
  if (path.startsWith('/assets/images/games/')) {
    return gameImages[`..${path}`];
  }
  try {
    const url = new URL(path);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function formatLikesCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
}

export { escapeHtml } from './html.ts';
