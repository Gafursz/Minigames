export type SnackbarVariant = 'success' | 'error';

export const SNACKBAR_DURATION = 6000;

export class Snackbar {
  private element: HTMLDivElement | undefined;
  private timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private hostController: AbortController | undefined;
  private returnFocus: HTMLElement | undefined;

  private create(): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'snackbar';
    if (typeof element.showPopover === 'function' && typeof element.hidePopover === 'function') {
      element.setAttribute('popover', 'manual');
    }
    element.setAttribute('aria-atomic', 'true');
    element.hidden = true;
    const symbol = document.createElement('span');
    symbol.className = 'snackbar__symbol';
    symbol.setAttribute('aria-hidden', 'true');

    const message = document.createElement('p');
    message.className = 'snackbar__message';

    const close = document.createElement('button');
    close.className = 'snackbar__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => this.dismiss());

    element.append(symbol, message, close);
    this.element = element;
    return element;
  }

  public show(message: string, variant: SnackbarVariant = 'success'): void {
    if (!message.trim()) return;
    globalThis.clearTimeout(this.timer);
    this.hostController?.abort();

    const element = this.element ?? this.create();
    const host = document.querySelector<HTMLDialogElement>('dialog[open]') ?? document.body;

    if (element.parentElement !== host) {
      if (typeof element.hidePopover === 'function' && element.matches(':popover-open')) {
        element.hidePopover();
      }
      host.append(element);
    }

    if (
      document.activeElement instanceof HTMLElement &&
      !element.contains(document.activeElement)
    ) {
      this.returnFocus = document.activeElement;
    }

    this.hostController = new AbortController();
    if (host instanceof HTMLDialogElement) {
      host.addEventListener('close', () => this.dismiss(), { signal: this.hostController.signal });
    }

    element.className = `snackbar snackbar--${variant}`;
    element.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    element.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
    const symbol = element.querySelector('.snackbar__symbol');
    const text = element.querySelector('.snackbar__message');
    if (symbol) symbol.textContent = variant === 'error' ? '!' : '✓';
    if (text) text.textContent = message;

    element.hidden = false;
    if (element.getAttribute('popover') === 'manual') element.showPopover();
    this.timer = globalThis.setTimeout(() => this.dismiss(), SNACKBAR_DURATION);
  }

  public dismiss(): void {
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
    this.hostController?.abort();
    this.hostController = undefined;
    const element = this.element;
    if (!element) return;

    const shouldRestoreFocus = element.contains(document.activeElement);
    if (typeof element.hidePopover === 'function' && element.matches(':popover-open')) {
      element.hidePopover();
    }
    element.hidden = true;
    if (shouldRestoreFocus && this.returnFocus?.isConnected) {
      this.returnFocus.focus({ preventScroll: true });
    }
    this.returnFocus = undefined;
  }

  public destroy(): void {
    this.dismiss();
    this.element?.remove();
    this.element = undefined;
  }
}

export const snackbar = new Snackbar();
