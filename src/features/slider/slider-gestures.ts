const dragThreshold = 8;
const swipeThreshold = 40;

interface GestureHandlers {
  onHold(): void;
  onRelease(): void;
  onSwipe(direction: number): void;
}

export function bindSliderGestures(
  track: HTMLElement,
  handlers: GestureHandlers,
  signal: AbortSignal,
): void {
  let pointerId: number | undefined;
  let startX = 0;
  let startY = 0;
  let distance = 0;
  let hasDragged = false;

  const finish = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    const capturedId = pointerId;
    pointerId = undefined;
    if (track.hasPointerCapture(capturedId)) track.releasePointerCapture(capturedId);
    if (hasDragged && event.type === 'pointerup' && Math.abs(distance) >= swipeThreshold) {
      handlers.onSwipe(distance < 0 ? 1 : -1);
    }
    track.classList.remove('is-dragging');
    handlers.onRelease();
  };

  track.addEventListener(
    'pointerdown',
    (event) => {
      if (pointerId !== undefined || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      distance = 0;
      hasDragged = false;
      handlers.onHold();
    },
    { signal },
  );

  track.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerId !== pointerId) return;
      distance = event.clientX - startX;
      if (
        !hasDragged &&
        (Math.abs(distance) < dragThreshold ||
          Math.abs(distance) <= Math.abs(event.clientY - startY))
      )
        return;
      hasDragged = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    },
    { signal },
  );

  globalThis.addEventListener('pointerup', finish, { signal });
  globalThis.addEventListener('pointercancel', finish, { signal });
  track.addEventListener('lostpointercapture', finish, { signal });
  track.addEventListener(
    'click',
    (event) => {
      if (!hasDragged || event.detail === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      hasDragged = false;
    },
    { signal, capture: true },
  );
}
