import { expect, test, vi } from 'vitest';
import type { TestContext } from 'vitest';
import { AutoplayTimer } from '../../src/features/slider/autoplay-timer';

function setup(context: TestContext) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  const advance = vi.fn();
  const timer = new AutoplayTimer(advance);
  context.onTestFinished(() => timer.destroy());
  return { timer, advance };
}

test('advances every four seconds and repeated start calls do not create duplicate timers', (context) => {
  const { timer, advance } = setup(context);
  timer.start();
  timer.start();

  vi.advanceTimersByTime(3999);
  expect(advance).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(advance).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(4000);
  expect(advance).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(1);
});

test('overlapping hover and dialog pauses preserve the unspent countdown', (context) => {
  const { timer, advance } = setup(context);
  timer.start();
  vi.advanceTimersByTime(1500);
  timer.pause('hover');
  timer.pause('dialog');
  vi.advanceTimersByTime(10_000);
  timer.resume('hover');
  vi.advanceTimersByTime(10_000);
  expect(advance).not.toHaveBeenCalled();

  timer.resume('dialog');
  vi.advanceTimersByTime(2499);
  expect(advance).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(advance).toHaveBeenCalledTimes(1);
});

test('reset starts a full countdown but cannot override an active pause', (context) => {
  const { timer, advance } = setup(context);
  timer.start();
  vi.advanceTimersByTime(1000);
  timer.pause('dialog');
  timer.reset();
  vi.advanceTimersByTime(8000);
  expect(advance).not.toHaveBeenCalled();

  timer.resume('dialog');
  vi.advanceTimersByTime(3999);
  expect(advance).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(advance).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(3000);
  timer.reset();
  vi.advanceTimersByTime(3999);
  expect(advance).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(advance).toHaveBeenCalledTimes(2);
});

test('destroy cancels pending work and prevents every public restart path', (context) => {
  const { timer, advance } = setup(context);
  timer.start();
  vi.advanceTimersByTime(1000);
  timer.destroy();
  timer.start();
  timer.resume('dialog');
  timer.reset();
  vi.advanceTimersByTime(20_000);

  expect(advance).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

test('destroying the carousel during its advance callback prevents another cycle', (context) => {
  const { timer, advance } = setup(context);
  advance.mockImplementation(() => timer.destroy());
  timer.start();
  vi.advanceTimersByTime(12_000);

  expect(advance).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
