const autoplayDelay = 4000;

export class AutoplayTimer {
  private timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private readonly pauseReasons = new Set<string>();
  private remaining = autoplayDelay;
  private deadline = 0;
  private isDestroyed = false;

  constructor(private readonly advance: () => void) {}

  public start(): void {
    if (this.isDestroyed || this.timer !== undefined || this.pauseReasons.size > 0) return;
    this.deadline = performance.now() + this.remaining;
    this.timer = globalThis.setTimeout(() => {
      this.timer = undefined;
      this.advance();
      this.remaining = autoplayDelay;
      this.start();
    }, this.remaining);
  }

  public pause(reason: string): void {
    this.pauseReasons.add(reason);
    if (this.timer === undefined) return;
    this.remaining = Math.max(0, this.deadline - performance.now());
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
  }

  public resume(reason: string): void {
    this.pauseReasons.delete(reason);
    this.start();
  }

  public reset(): void {
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
    this.remaining = autoplayDelay;
    this.start();
  }

  public destroy(): void {
    this.isDestroyed = true;
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
