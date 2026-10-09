import { afterEach, describe, expect, test, vi } from 'vitest';
import { bindSliderGestures } from '../../src/features/slider/slider-gestures';

describe('Slider gestures', () => {
  const controllers: AbortController[] = [];

  afterEach(() => {
    for (const controller of controllers) controller.abort();
    controllers.length = 0;
    vi.unstubAllGlobals();
  });

  function setup() {
    const controller = new AbortController();
    controllers.push(controller);

    const listeners = new Map<string, EventListener[]>();
    const captured = new Set<number>();
    const classes = new Set<string>();

    const track = {
      classList: {
        add: vi.fn((name: string) => classes.add(name)),
        remove: vi.fn((name: string) => classes.delete(name)),
        contains: (name: string) => classes.has(name),
      },
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      }),
      setPointerCapture: vi.fn((id: number) => captured.add(id)),
      hasPointerCapture: vi.fn((id: number) => captured.has(id)),
      releasePointerCapture: vi.fn((id: number) => captured.delete(id)),
    };

    const globalListeners = new Map<string, EventListener>();

    vi.stubGlobal('addEventListener', (type: string, listener: EventListener) => {
      globalListeners.set(type, listener);
    });

    const handlers = {
      onHold: vi.fn(),
      onRelease: vi.fn(),
      onSwipe: vi.fn(),
    };

    bindSliderGestures(track as unknown as HTMLElement, handlers, controller.signal);

    function emit(
      type: string,
      options: {
        pointerId?: number;
        clientX?: number;
        clientY?: number;
        button?: number;
        detail?: number;
      } = {},
    ) {
      const event = {
        type,
        pointerId: options.pointerId ?? 1,
        clientX: options.clientX ?? 0,
        clientY: options.clientY ?? 0,
        button: options.button ?? 0,
        detail: options.detail ?? 1,
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn(),
      } as unknown as PointerEvent;

      const local = listeners.get(type) ?? [];
      for (const listener of local) listener(event);

      globalListeners.get(type)?.(event);

      return event;
    }

    return { track, handlers, emit };
  }

  test('holds on primary pointerdown and ignores other pointers or buttons', () => {
    const { handlers, emit } = setup();

    emit('pointerdown', { pointerId: 1, clientX: 100 });
    emit('pointerdown', { pointerId: 2, clientX: 100 });
    emit('pointerdown', { pointerId: 3, button: 2 });

    expect(handlers.onHold).toHaveBeenCalledOnce();

    emit('pointerup', { pointerId: 2 });
    expect(handlers.onRelease).not.toHaveBeenCalled();

    emit('pointerup', { pointerId: 1 });
    expect(handlers.onRelease).toHaveBeenCalledOnce();
  });

  test('ignores small and predominantly vertical movements', () => {
    const { track, handlers, emit } = setup();

    emit('pointerdown', { clientX: 100, clientY: 100 });
    emit('pointermove', { clientX: 95, clientY: 100 });
    emit('pointermove', { clientX: 80, clientY: 140 });

    expect(track.setPointerCapture).not.toHaveBeenCalled();

    emit('pointerup', { clientX: 80 });
    expect(handlers.onSwipe).not.toHaveBeenCalled();
  });

  test('swipes left and right once the threshold is reached', () => {
    const { track, handlers, emit } = setup();

    emit('pointerdown', { pointerId: 1, clientX: 100 });
    emit('pointermove', { pointerId: 1, clientX: 50 });

    expect(track.classList.contains('is-dragging')).toBe(true);
    expect(track.setPointerCapture).toHaveBeenCalledWith(1);

    emit('pointerup', { pointerId: 1, clientX: 50 });

    expect(handlers.onSwipe).toHaveBeenLastCalledWith(1);
    expect(track.classList.contains('is-dragging')).toBe(false);
    expect(track.releasePointerCapture).toHaveBeenCalledWith(1);

    emit('pointerdown', { pointerId: 2, clientX: 50 });
    emit('pointermove', { pointerId: 2, clientX: 100 });
    emit('pointerup', { pointerId: 2, clientX: 100 });

    expect(handlers.onSwipe).toHaveBeenLastCalledWith(-1);
    expect(handlers.onSwipe).toHaveBeenCalledTimes(2);
  });

  test('releases without swiping when movement is below 40px', () => {
    const { handlers, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 80 });
    emit('pointerup', { clientX: 80 });

    expect(handlers.onRelease).toHaveBeenCalledOnce();
    expect(handlers.onSwipe).not.toHaveBeenCalled();
  });

  test('cancelling a gesture never navigates', () => {
    const { handlers, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 40 });
    emit('pointercancel', { clientX: 40 });

    expect(handlers.onRelease).toHaveBeenCalledOnce();
    expect(handlers.onSwipe).not.toHaveBeenCalled();
  });

  test('prevents accidental pointer clicks after dragging', () => {
    const { emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    emit('pointerup', { clientX: 50 });

    const click = emit('click');

    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(click.stopImmediatePropagation).toHaveBeenCalledOnce();

    const secondClick = emit('click');

    expect(secondClick.preventDefault).not.toHaveBeenCalled();
  });

  test('allows keyboard-generated clicks', () => {
    const { emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    emit('pointerup', { clientX: 50 });

    const click = emit('click', { detail: 0 });

    expect(click.preventDefault).not.toHaveBeenCalled();
  });
});
