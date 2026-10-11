import { createDom } from '../feedback/dom.mjs';

// Browser-only APIs are fakes here; native rendering and gestures need Chrome checks.
export function createBrowserDom(context, markup = '<div id="app"></div>', path = '/Minigames/') {
  const window = createDom(context, markup);
  window.history.replaceState({}, '', path);
  const replacements = {
    Element: window.Element,
    HTMLAnchorElement: window.HTMLAnchorElement,
    HTMLButtonElement: window.HTMLButtonElement,
    location: window.location,
    history: window.history,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    getComputedStyle: window.getComputedStyle.bind(window),
    scrollTo: () => {},
    requestAnimationFrame: (callback) => globalThis.setTimeout(callback, 0),
    cancelAnimationFrame: (id) => globalThis.clearTimeout(id),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const originals = new Map();
  for (const [name, value] of Object.entries(replacements)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  class DialogMethods extends window.HTMLDialogElement {
    showModal() {
      this.setAttribute('open', '');
    }

    close() {
      if (!this.open) return;
      this.removeAttribute('open');
      this.dispatchEvent(new window.Event('close'));
    }
  }
  for (const name of ['showModal', 'close']) {
    Object.defineProperty(window.HTMLDialogElement.prototype, name, {
      configurable: true,
      value: DialogMethods.prototype[name],
    });
  }
  context.onTestFinished(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
  return window;
}
