const dragThreshold = 8;

export function enableHorizontalDrag(element: HTMLElement, signal: AbortSignal): void {
  let pointerId: number | undefined;
  let startX = 0;
  let startScroll = 0;
  let hasDragged = false;

  element.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !event.isPrimary) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = element.scrollLeft;
      hasDragged = false;
    },
    { signal },
  );

  element.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      if (!hasDragged && Math.abs(distance) < dragThreshold) return;

      hasDragged = true;
      element.setPointerCapture(event.pointerId);
      element.classList.add('is-dragging');
      element.scrollLeft = startScroll - distance;
    },
    { signal },
  );

  const finish = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    pointerId = undefined;
    element.classList.remove('is-dragging');
  };

  globalThis.addEventListener('pointerup', finish, { signal });
  globalThis.addEventListener('pointercancel', finish, { signal });

  // Revealing more categories by dragging must not also select a chip.
  element.addEventListener(
    'click',
    (event) => {
      if (hasDragged && event.detail > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      hasDragged = false;
    },
    { signal, capture: true },
  );
}
