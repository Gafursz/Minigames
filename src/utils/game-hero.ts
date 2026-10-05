import { getApiGameCardImage } from './game';

const heroImages = import.meta.glob('../assets/images/games/*-hero.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export function getApiGameHeroImage(path: string): string | undefined {
  return path.startsWith('/assets/images/games/')
    ? heroImages[`..${path}`]
    : getApiGameCardImage(path);
}
