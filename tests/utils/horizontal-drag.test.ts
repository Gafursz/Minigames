import { afterEach, describe, expect, test, vi } from 'vitest';
import { enableHorizontalDrag } from '../../src/utils/horizontal-drag';

describe('Horizontal drag', () => {
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
    const globalListeners = new Map<string, EventListener>();
    const captured = new Set<number>();
    const classes = new Set<string>();

    const element = {
      scrollLeft: 100,
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

    vi.stubGlobal('addEventListener', (type: string, listener: EventListener) => {
      globalListeners.set(type, listener);
    });

    enableHorizontalDrag(element as unknown as HTMLElement, controller.signal);

    function emit(
      type: string,
      options: {
        pointerId?: number;
        clientX?: number;
        button?: number;
        isPrimary?: boolean;
        detail?: number;
      } = {},
    ) {
      const event = {
        type,
        pointerId: options.pointerId ?? 1,
        clientX: options.clientX ?? 0,
        button: options.button ?? 0,
        isPrimary: options.isPrimary ?? true,
        detail: options.detail ?? 1,
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn(),
      } as unknown as PointerEvent;

      const eventListeners = listeners.get(type) ?? [];

      for (const listener of eventListeners) listener(event);
      globalListeners.get(type)?.(event);

      return event;
    }

    return { element, emit };
  }

  test('ignores secondary mouse buttons and non-primary pointers', () => {
    const { element, emit } = setup();

    emit('pointerdown', { button: 2, clientX: 100 });
    emit('pointermove', { clientX: 50 });

    emit('pointerdown', { isPrimary: false, clientX: 100 });
    emit('pointermove', { clientX: 50 });

    expect(element.scrollLeft).toBe(100);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });

  test('does not start dragging below the 8px threshold', () => {
    const { element, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 93 });

    expect(element.scrollLeft).toBe(100);
    expect(element.classList.contains('is-dragging')).toBe(false);
  });

  test('starts dragging at 8px and updates horizontal scrolling', () => {
    const { element, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 92 });

    expect(element.scrollLeft).toBe(108);
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    expect(element.classList.contains('is-dragging')).toBe(true);

    emit('pointermove', { clientX: 120 });

    expect(element.scrollLeft).toBe(80);
  });

  test('ignores pointer movements from another pointer', () => {
    const { element, emit } = setup();

    emit('pointerdown', { pointerId: 1, clientX: 100 });
    emit('pointermove', { pointerId: 2, clientX: 50 });

    expect(element.scrollLeft).toBe(100);
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });

  test('releases pointer capture when dragging finishes', () => {
    const { element, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    emit('pointerup');

    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(element.classList.contains('is-dragging')).toBe(false);
  });

  test('pointer cancellation ends dragging without changing scroll position', () => {
    const { element, emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    const scrollPosition = element.scrollLeft;

    emit('pointercancel');

    expect(element.scrollLeft).toBe(scrollPosition);
    expect(element.classList.contains('is-dragging')).toBe(false);
  });

  test('ignores pointerup from another pointer', () => {
    const { element, emit } = setup();

    emit('pointerdown', { pointerId: 1, clientX: 100 });
    emit('pointermove', { pointerId: 1, clientX: 50 });
    emit('pointerup', { pointerId: 2 });

    expect(element.classList.contains('is-dragging')).toBe(true);
  });

  test('prevents accidental clicks after dragging', () => {
    const { emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    emit('pointerup');

    const click = emit('click');

    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(click.stopImmediatePropagation).toHaveBeenCalledOnce();

    const nextClick = emit('click');
    expect(nextClick.preventDefault).not.toHaveBeenCalled();
  });

  test('allows keyboard-generated clicks after dragging', () => {
    const { emit } = setup();

    emit('pointerdown', { clientX: 100 });
    emit('pointermove', { clientX: 50 });
    emit('pointerup');

    const click = emit('click', { detail: 0 });

    expect(click.preventDefault).not.toHaveBeenCalled();
  });
});
