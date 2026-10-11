import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { once } from 'node:events';
import { URL } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const game = (name) => ({
  slug: name,
  name,
  category: 'all',
  price: 'Free',
  shortDescription: 'API game',
  rating: 4,
  likesCount: 5,
  cardImage: '/assets/images/games/cat-mail-co-card.jpg',
});
const response = (page, totalPages, data = [game(`page-${page}`)]) => ({
  data,
  meta: {
    page,
    totalPages,
    totalItems: totalPages * 6,
    limit: 6,
    appliedFilter: { category: 'all', sort: 'rating-desc' },
  },
});
async function setup(context, path = '/Minigames/library', isDesktop = false) {
  const { App } = await import('../../src/app/app.ts');
  let app;

  const window = createBrowserDom(context, '<div id="app"></div>', path);
  context.onTestFinished(() => app?.destroy());
  const { document } = window;
  let resize;
  let disconnected = 0;
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: class {
      constructor(callback) {
        resize = callback;
      }
      observe() {}
      disconnect() {
        disconnected += 1;
      }
    },
  });
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((target, options) => {
    const url = new URL(target);
    if (url.pathname.endsWith('/leaderboard') || url.searchParams.has('featured'))
      return Promise.resolve(globalThis.Response.json({ data: [], meta: {} }));
    return new Promise((resolve, reject) => {
      calls.push({ url, options, resolve, reject });
    });
  });
  app = new App(document.querySelector('#app'));
  app.render();
  const complete = async (index, body, status = 200) => {
    calls[index].resolve(globalThis.Response.json(body, { status }));
    await nextTurn();
  };
  const nav = document.querySelector('.pagination');
  nav.style.setProperty('--page-buttons', isDesktop ? '4' : '3');
  resize();
  const ready = async (page = 1, pages = 8) => {
    await complete(0, {
      data: [
        { slug: 'all', label: 'All', isDefault: true },
        { slug: 'puzzle', label: 'Puzzle', isDefault: false },
      ],
    });
    await complete(1, response(page, pages));
  };
  const numbers = () =>
    [...nav.querySelectorAll('[data-page]:not([data-direction])')].map((node) =>
      Number(node.dataset.page),
    );
  const current = () => Number(nav.querySelector('[aria-current="page"]').dataset.page);
  const click = (page) =>
    [...nav.querySelectorAll('[data-page]')]
      .find((node) => Number(node.dataset.page) === page && !node.dataset.direction)
      ?.click();
  return {
    window,
    document,
    app,
    calls,
    complete,
    ready,
    nav,
    numbers,
    current,
    click,
    resize: () => resize(),
    disconnected: () => disconnected,
  };
}

test('metadata drives mobile/desktop page windows and smaller page counts', async (context) => {
  const { ready, nav, numbers, resize, current, calls, complete, click } = await setup(context);
  await ready();
  assert.deepEqual(numbers(), [1, 2, 3]);
  nav.style.setProperty('--page-buttons', '4');
  resize();
  assert.deepEqual(numbers(), [1, 2, 3, 4]);
  click(4);
  await complete(2, response(4, 8));
  assert.deepEqual(numbers(), [2, 3, 4, 5]);
  assert.equal(current(), 4);
  nav.style.setProperty('--page-buttons', '3');
  resize();
  assert.deepEqual(numbers(), [3, 4, 5]);
  assert.equal(calls.length, 3);
  click(3);
  await complete(3, response(2, 2));
  assert.deepEqual(numbers(), [1, 2]);
  assert.equal(current(), 2);
  assert.ok(nav.querySelector('[data-direction="next"]').disabled);
});

test('page clicks send combined parameters, update URL and show only returned cards', async (context) => {
  const { ready, nav, calls, complete, document, window, current } = await setup(
    context,
    '/Minigames/library?category=puzzle&sort=name-desc&utm_source=test',
  );
  await ready();
  assert.ok(nav.querySelector('[data-direction="previous"]').disabled);
  nav.querySelector('[data-direction="next"]').click();
  assert.deepEqual(Object.fromEntries(calls[2].url.searchParams), {
    category: 'puzzle',
    sort: 'name-desc',
    page: '2',
    limit: '6',
  });
  assert.equal(new URL(window.location.href).searchParams.get('page'), '2');
  assert.equal(new URL(window.location.href).searchParams.get('utm_source'), 'test');
  assert.equal(nav.getAttribute('aria-busy'), 'true');
  assert.ok([...nav.querySelectorAll('button')].every((button) => button.disabled));
  await complete(2, response(2, 8, [game('only-returned-game')]));
  assert.equal(current(), 2);
  assert.deepEqual(
    [...document.querySelectorAll('.library-card__title')].map((node) => node.textContent),
    ['only-returned-game'],
  );
});

test('direct links and Back/Forward restore page metadata without growing history', async (context) => {
  const { ready, click, complete, current, window, calls } = await setup(
    context,
    '/Minigames/library?category=all&page=5',
  );
  await ready(5, 8);
  assert.equal(current(), 5);
  click(6);
  await complete(2, response(6, 8));
  const length = window.history.length;
  let event = once(window, 'popstate');
  window.history.back();
  await event;
  assert.equal(calls[3].url.searchParams.get('page'), '5');
  await complete(3, response(5, 8));
  assert.equal(current(), 5);
  event = once(window, 'popstate');
  window.history.forward();
  await event;
  await complete(4, response(6, 8));
  assert.equal(current(), 6);
  assert.equal(window.history.length, length);
});

test('category and sort changes reset the requested page and displayed controls', async (context) => {
  const { ready, calls, document, complete, current } = await setup(
    context,
    '/Minigames/library?category=all&page=4',
  );
  await ready(4, 8);
  document.querySelector('[data-category="puzzle"]').click();
  assert.equal(calls[2].url.searchParams.get('page'), '1');
  await complete(2, response(1, 2));
  assert.equal(current(), 1);
  document.querySelector('.library-sort__trigger').click();
  document.querySelector('[data-sort-index="2"]').click();
  assert.equal(calls[3].url.searchParams.get('page'), '1');
  assert.equal(calls[3].url.searchParams.get('category'), 'puzzle');
  await complete(3, response(1, 2));
  assert.equal(current(), 1);
});

test('empty results retain page one and both disabled arrows with Data Not Found', async (context) => {
  const { complete, calls, nav, numbers, current, document, window } = await setup(
    context,
    '/Minigames/library?category=all&page=3',
  );
  await complete(0, { data: [{ slug: 'all', label: 'All', isDefault: true }] });
  await complete(1, response(3, 0, []));
  assert.equal(current(), 1);
  assert.deepEqual(numbers(), [1]);
  assert.equal(nav.querySelectorAll('[data-direction]:disabled').length, 2);
  assert.match(document.querySelector('.library__cards').textContent, /Data Not Found/);
  assert.ok(!new URL(window.location.href).searchParams.has('page'));
  assert.equal(calls.length, 2);
});

test('out-of-range bookmarks replace the page and fetch page one exactly once', async (context) => {
  const { complete, calls, window, current, document } = await setup(
    context,
    '/Minigames/library?category=all&page=999',
  );
  const length = window.history.length;
  await complete(0, { data: [{ slug: 'all', label: 'All', isDefault: true }] });
  await complete(1, response(999, 4, []));
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url.searchParams.get('page'), '1');
  await complete(2, response(1, 4));
  assert.equal(current(), 1);
  assert.equal(window.history.length, length);
  assert.ok(!new URL(window.location.href).searchParams.has('page'));
  assert.match(document.querySelector('.library-card__title').textContent, /page-1/);
});

test('malformed metadata becomes a retryable error and recovery uses the same query', async (context) => {
  const { ready, click, complete, document, nav, calls, current } = await setup(context);
  await ready();
  click(2);
  await complete(2, { data: [game('wrong')], meta: { page: '2', totalPages: 4 } });
  assert.equal(document.querySelector('.library__cards').dataset.feedbackState, 'error');
  assert.ok([...nav.querySelectorAll('button')].every((button) => button.disabled));
  document.querySelector('.library__cards .content-feedback__retry').click();
  assert.equal(calls[3].url.href, calls[2].url.href);
  await complete(3, response(2, 8));
  assert.equal(current(), 2);
});

test('keyboard boundaries avoid duplicate calls and preserve focus after a response', async (context) => {
  const { ready, nav, window, complete, current, calls, document } = await setup(context);
  await ready(1, 5);
  const active = nav.querySelector('[aria-current="page"]');
  active.focus();
  active.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  assert.equal(calls.length, 2);
  active.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(calls[2].url.searchParams.get('page'), '5');
  assert.equal(document.activeElement, nav);
  await complete(2, response(5, 5));
  assert.equal(current(), 5);
  assert.equal(document.activeElement, nav.querySelector('[aria-current="page"]'));
  document.activeElement.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
  );
  assert.equal(calls.length, 3);
});

test('stale metadata cannot overwrite a newer filter result', async (context) => {
  const { ready, click, document, calls, complete, numbers, current } = await setup(context);
  await ready();
  click(2);
  document.querySelector('[data-category="puzzle"]').click();
  assert.ok(calls[2].options.signal.aborted);
  await complete(3, response(1, 2));
  await complete(2, response(2, 8));
  assert.equal(current(), 1);
  assert.deepEqual(numbers(), [1, 2]);
});

test('page disposal disconnects pagination observation and ignores detached controls', async (context) => {
  const { ready, nav, app, calls, disconnected } = await setup(context);
  await ready();
  const next = nav.querySelector('[data-direction="next"]');
  app.destroy();
  next.click();
  assert.equal(calls.length, 2);
  assert.ok(disconnected() > 0);
});
