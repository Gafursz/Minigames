import { build } from 'vite';
import { JSDOM, VirtualConsole } from 'jsdom';

const bundle = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    minify: false,
    lib: { entry: 'tests/entry.ts', name: 'MiniGames', formats: ['iife'] },
  },
});
const code = bundle[0].output.find((item) => item.type === 'chunk').code;

export function createApp(hash = '#/library') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    errors.push(error.message);
  });
  const dom = new JSDOM(
    '<!doctype html><html lang="en"><head><title>MiniGames</title></head><body><div id="app"></div></body></html>',
    {
      url: `https://example.com/Minigames/${hash}`,
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole,
    },
  );
  const browser = dom.window;
  const timers = new Map();
  const observers = new Set();
  let now = 0;
  let timerId = 0;
  browser.setTimeout = (callback, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  browser.clearTimeout = (id) => timers.delete(id);
  browser.performance.now = () => now;
  browser.scrollTo = () => {};
  browser.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      observers.add(this);
      this.callback();
    }
    disconnect() {
      observers.delete(this);
    }
  };
  class PointerCaptureStub {
    capturedId;
    setPointerCapture(id) {
      this.capturedId = id;
    }
    hasPointerCapture(id) {
      return this.capturedId === id;
    }
    releasePointerCapture() {
      this.capturedId = undefined;
    }
  }
  for (const method of ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']) {
    browser.HTMLElement.prototype[method] = PointerCaptureStub.prototype[method];
  }
  // jsdom has no layout/top-layer engine. Model only the dialog's DOM contract.
  class DialogStub {
    open = false;
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
    }
  }
  browser.HTMLDialogElement.prototype.showModal = DialogStub.prototype.showModal;
  browser.HTMLDialogElement.prototype.close = DialogStub.prototype.close;
  browser.eval(code);
  const app = new browser.MiniGames.App(browser.document.querySelector('#app'));
  app.render();

  const tick = (duration) => {
    const end = now + duration;
    while (true) {
      const next = [...timers]
        .filter(([, timer]) => timer.at <= end)
        .toSorted((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = end;
  };
  const query = (selector) => browser.document.querySelector(selector);
  const all = (selector) => [...browser.document.querySelectorAll(selector)];
  const click = (selector) => query(selector).click();
  const pointer = (target, type, x, y = 10) =>
    target.dispatchEvent(
      new browser.PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: x,
        clientY: y,
      }),
    );
  return {
    dom,
    browser,
    app,
    errors,
    timers,
    observers,
    tick,
    query,
    all,
    click,
    pointer,
    async navigate(action) {
      const done = new Promise((resolve) =>
        browser.addEventListener('hashchange', resolve, { once: true }),
      );
      action();
      await done;
    },
    resize() {
      for (const observer of observers) observer.callback();
    },
    close() {
      app.page?.destroy?.();
      app.gameDetails?.destroy();
      dom.window.close();
    },
  };
}
