export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function getSlideOffset(index: number, activeIndex: number, count: number): number {
  const radius = Math.floor(count / 2);
  return wrapIndex(index - activeIndex + radius, count) - radius;
}
