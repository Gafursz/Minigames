import { beforeEach, vi } from 'vitest';

beforeEach((context) => {
  // Every test supplies its own responses; a missing mock must never use the live API.
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(
    new Error('Unexpected network request: provide a fetch mock for this test.'),
  );

  // Registered first, so Vitest runs this after component and DOM cleanup hooks.
  context.onTestFinished(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
