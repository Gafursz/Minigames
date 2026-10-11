import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { URL } from 'node:url';
import { once } from 'node:events';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const catalog = (defaultSlug = 'all') => ({
  data: [
    { slug: 'card', label: 'API Cards', isDefault: defaultSlug === 'card' },
    { slug: 'all', label: 'API All Games', isDefault: defaultSlug === 'all' },
    { slug: 'puzzle', label: 'API Puzzles', isDefault: defaultSlug === 'puzzle' },
    { slug: 'arcade', label: 'API Arcade', isDefault: defaultSlug === 'arcade' },
  ],
  meta: { totalItems: 4 },
});
const game = (slug, name = slug) => ({
  slug,
  name,
  category: 'puzzle',
  price: 'Free',
  shortDescription: 'An API result.',
  rating: 4.7,
  likesCount: 2000,
  cardImage: '/assets/images/games/cat-mail-co-card.jpg',
});
const games = (data) => ({
  data,
  meta: {
    page: 1,
    limit: 6,
    totalItems: data.length,
    totalPages: 1,
    appliedFilter: { category: 'all', sort: 'rating-desc' },
  },
});

async function setup(context, path = '/Minigames/library') {
  const { App } = await import('../../src/app/app.ts');
  let app;

  const window = createBrowserDom(context, '<div id="app"></div>', path);
  context.onTestFinished(() => app?.destroy());
  const oldNode = Object.getOwnPropertyDescriptor(globalThis, 'Node');
  Object.defineProperty(globalThis, 'Node', { configurable: true, value: window.Node });
  context.onTestFinished(() => {
    if (oldNode) Object.defineProperty(globalThis, 'Node', oldNode);
    else Reflect.deleteProperty(globalThis, 'Node');
  });
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((target, options) => {
    const url = new URL(target);
    if (url.pathname.includes('/games/')) {
      return Promise.resolve(
        globalThis.Response.json({ error: 'Game fixture not defined' }, { status: 404 }),
      );
    }
    // Home can also be API-backed in the combined integration build.
    if (url.pathname.endsWith('/leaderboard') || url.searchParams.has('featured')) {
      return Promise.resolve(globalThis.Response.json({ data: [], meta: {} }));
    }
    return new Promise((resolve, reject) => {
      calls.push({ url, options, resolve, reject });
    });
  });
  app = new App(window.document.querySelector('#app'));
  app.render();
  const complete = async (index, body, status = 200) => {
    calls[index].resolve(globalThis.Response.json(body, { status }));
    await nextTurn();
  };
  const selectSort = (index) => {
    window.document.querySelector('.library-sort__trigger').click();
    window.document.querySelectorAll('[data-sort-index]')[index].click();
  };
  const queryParameters = (index) => Object.fromEntries(calls[index].url.searchParams);
  const currentUrl = () => new URL(window.location.href);
  const activeCategory = () =>
    window.document.querySelector('[data-category][aria-pressed="true"]')?.dataset.category;
  return {
    window,
    document: window.document,
    app,
    calls,
    complete,
    selectSort,
    queryParameters,
    currentUrl,
    activeCategory,
  };
}

const listState = (document) => document.querySelector('.library__cards').dataset.feedbackState;
const catalogState = (document) =>
  document.querySelector('.library-filters__categories').dataset.feedbackState;

async function travel(window, direction) {
  const changed = once(window, 'popstate');
  window.history[direction]();
  await changed;
}

test('loads API category labels/order and honors isDefault without adding a Back step', async (context) => {
  const { document, window, calls, complete, queryParameters, currentUrl, activeCategory } =
    await setup(context);
  const historyLength = window.history.length;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, '/api/categories');
  assert.equal(calls[0].url.search, '');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(catalogState(document), 'loading');
  assert.equal(listState(document), 'loading');
  assert.equal(
    document.querySelectorAll('.feedback-skeleton--categories .feedback-skeleton__item').length,
    7,
  );
  await complete(0, catalog('card'));
  assert.deepEqual(
    [...document.querySelectorAll('[data-category]')].map((chip) => chip.textContent),
    ['API Cards', 'API All Games', 'API Puzzles', 'API Arcade'],
  );
  assert.equal(activeCategory(), 'card');
  assert.equal(currentUrl().searchParams.get('category'), 'card');
  assert.equal(window.history.length, historyLength);
  assert.deepEqual(queryParameters(1), {
    category: 'card',
    sort: 'rating-desc',
    page: '1',
    limit: '6',
  });
  await complete(1, games([game('server-game')]));
  assert.equal(listState(document), 'ready');
});

test('a direct Library URL restores category, sort, and the corresponding request', async (context) => {
  const { document, complete, queryParameters, activeCategory } = await setup(
    context,
    '/Minigames/library?category=puzzle&sort=name-desc&page=3&utm_source=test',
  );
  await complete(0, catalog());
  assert.equal(activeCategory(), 'puzzle');
  assert.equal(document.querySelector('.library-sort__label').textContent, 'Name Z→A');
  assert.equal(
    document.querySelector('[data-sort-index="3"]').getAttribute('aria-selected'),
    'true',
  );
  assert.deepEqual(queryParameters(1), {
    category: 'puzzle',
    sort: 'name-desc',
    page: '3',
    limit: '6',
  });
  await complete(
    1,
    games([game('b', 'Backend second alphabetically'), game('a', 'Backend first alphabetically')]),
  );
  assert.deepEqual(
    [...document.querySelectorAll('.library-card__title')].map((node) => node.textContent),
    ['Backend second alphabetically', 'Backend first alphabetically'],
  );
});

test('category changes keep sorting, reset page one, and preserve unrelated URL state', async (context) => {
  const { document, window, calls, complete, queryParameters, currentUrl, activeCategory } =
    await setup(
      context,
      '/Minigames/library?category=puzzle&sort=name-asc&page=4&game=cat-mail-co&utm_source=test',
    );
  await complete(0, catalog());
  await complete(1, games([game('old')]));
  const page = document.querySelector('main');
  const length = window.history.length;
  document.querySelector('[data-category="card"]').click();
  assert.equal(document.querySelector('main'), page);
  assert.equal(window.history.length, length + 1);
  assert.equal(activeCategory(), 'card');
  assert.equal(currentUrl().searchParams.get('sort'), 'name-asc');
  assert.ok(!currentUrl().searchParams.has('page'));
  assert.equal(currentUrl().searchParams.get('game'), 'cat-mail-co');
  assert.equal(currentUrl().searchParams.get('utm_source'), 'test');
  assert.deepEqual(queryParameters(2), {
    category: 'card',
    sort: 'name-asc',
    page: '1',
    limit: '6',
  });
  assert.equal(listState(document), 'loading');
  document.querySelector('[data-category="card"]').click();
  assert.equal(calls.length, 3);
  await complete(2, games([game('new')]));
  assert.equal(document.querySelector('.library-card__title').textContent, 'new');
});

test('all four sorts go to the backend with the active category and page one', async (context) => {
  const { document, calls, complete, queryParameters, selectSort, currentUrl } = await setup(
    context,
    '/Minigames/library?category=arcade&page=3',
  );
  await complete(0, catalog());
  await complete(1, games([game('initial')]));
  for (const [index, value, label] of [
    [0, 'rating-asc', 'Rating ↑'],
    [2, 'name-asc', 'Name A→Z'],
    [3, 'name-desc', 'Name Z→A'],
    [1, 'rating-desc', 'Rating ↓'],
  ]) {
    const count = calls.length;
    selectSort(index);
    assert.deepEqual(queryParameters(count), {
      category: 'arcade',
      sort: value,
      page: '1',
      limit: '6',
    });
    assert.equal(document.querySelector('.library-sort__label').textContent, label);
    assert.equal(document.querySelector('.library-sort__options').hidden, true);
    assert.equal(document.activeElement, document.querySelector('.library-sort__trigger'));
    assert.equal(
      currentUrl().searchParams.get('sort') ?? undefined,
      value === 'rating-desc' ? undefined : value,
    );
    assert.ok(!currentUrl().searchParams.has('page'));
    await complete(count, games([game(value)]));
  }
  const count = calls.length;
  selectSort(1);
  assert.equal(calls.length, count);
});

test('Back and Forward restore controls and refetch matching data without reloading the page', async (context) => {
  const { document, window, complete, queryParameters, selectSort, activeCategory } =
    await setup(context);
  await complete(0, catalog());
  await complete(1, games([game('all')]));
  const page = document.querySelector('main');
  document.querySelector('[data-category="puzzle"]').click();
  await complete(2, games([game('puzzle')]));
  selectSort(2);
  await complete(3, games([game('sorted')]));
  const length = window.history.length;
  await travel(window, 'back');
  assert.equal(document.querySelector('.library-sort__label').textContent, 'Rating ↓');
  assert.equal(activeCategory(), 'puzzle');
  assert.deepEqual(queryParameters(4), {
    category: 'puzzle',
    sort: 'rating-desc',
    page: '1',
    limit: '6',
  });
  await complete(4, games([game('back-puzzle')]));
  await travel(window, 'back');
  assert.equal(activeCategory(), 'all');
  assert.equal(queryParameters(5).category, 'all');
  await complete(5, games([game('back-all')]));
  await travel(window, 'forward');
  assert.equal(queryParameters(6).category, 'puzzle');
  await complete(6, games([game('forward-puzzle')]));
  await travel(window, 'forward');
  assert.equal(queryParameters(7).sort, 'name-asc');
  await complete(7, games([game('forward-sorted')]));
  assert.equal(document.querySelector('.library-sort__label').textContent, 'Name A→Z');
  assert.equal(document.querySelector('main'), page);
  assert.equal(window.history.length, length);
});

test('sort changes during category loading apply to the first games request', async (context) => {
  const { calls, complete, queryParameters, selectSort } = await setup(context);
  selectSort(3);
  assert.equal(calls.length, 1);
  await complete(0, catalog('puzzle'));
  assert.equal(calls.length, 2);
  assert.deepEqual(queryParameters(1), {
    category: 'puzzle',
    sort: 'name-desc',
    page: '1',
    limit: '6',
  });
});

test('rapid filter changes cancel old requests and ignore stale success or failure', async (context) => {
  const { document, calls, complete } = await setup(context);
  await complete(0, catalog());
  document.querySelector('[data-category="puzzle"]').click();
  document.querySelector('[data-category="card"]').click();
  assert.ok(calls[1].options.signal.aborted);
  assert.ok(calls[2].options.signal.aborted);
  await complete(3, games([game('latest-card')]));
  await complete(1, games([game('stale-all')]));
  calls[2].reject(new Error('stale failure'));
  await nextTurn();
  assert.equal(document.querySelector('.library-card__title').textContent, 'latest-card');
  assert.ok(!document.querySelector('.snackbar'));
});

test('categories failure stops dependent loading and Retry uses the latest URL selection', async (context) => {
  const { document, calls, complete, queryParameters, selectSort } = await setup(
    context,
    '/Minigames/library?category=puzzle',
  );
  await complete(0, { error: 'Categories unavailable' }, 503);
  assert.equal(catalogState(document), 'error');
  assert.equal(document.querySelector('.library__cards').getAttribute('aria-busy'), 'false');
  assert.equal(calls.length, 1);
  selectSort(0);
  const retry = document.querySelector('.library-filters__categories .content-feedback__retry');
  retry.click();
  retry.click();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.pathname, '/api/categories');
  await complete(1, catalog());
  assert.deepEqual(queryParameters(2), {
    category: 'puzzle',
    sort: 'rating-asc',
    page: '1',
    limit: '6',
  });
  assert.ok(document.querySelector('.snackbar--success'));
  await complete(2, games([]));
  assert.equal(listState(document), 'empty');
});

test('empty categories show a distinct placeholder without a guessed games request', async (context) => {
  const { document, calls, complete } = await setup(context);
  await complete(0, { data: [], meta: { totalItems: 0 } });
  assert.equal(catalogState(document), 'empty');
  assert.match(
    document.querySelector('.library-filters__categories').textContent,
    /Data Not Found/,
  );
  assert.equal(calls.length, 1);
  assert.ok(!document.querySelector('.content-feedback__retry, [data-category]'));
  assert.equal(document.querySelector('.library__cards').getAttribute('aria-busy'), 'false');
});

test('invalid category payloads are retryable errors without partial chips', async (context) => {
  const { document, calls, complete } = await setup(context);
  const badPayloads = [
    {},
    { data: 'wrong' },
    catalog('missing-default'),
    {
      data: [
        { slug: 'all', label: 'All', isDefault: true },
        { slug: 'all', label: 'Duplicate', isDefault: false },
      ],
    },
    {
      data: [
        { slug: 'all', label: 'All', isDefault: true },
        { slug: 'card', label: 'Cards', isDefault: true },
      ],
    },
    { data: [{ slug: 'all', label: 'All', isDefault: 'true' }] },
  ];
  for (const payload of badPayloads) {
    await complete(calls.length - 1, payload);
    assert.equal(catalogState(document), 'error');
    assert.ok(!document.querySelector('[data-category]'));
    document.querySelector('.content-feedback__retry').click();
  }
  await complete(calls.length - 1, catalog());
  assert.equal(catalogState(document), 'ready');
});

test('category labels and slugs are escaped and encoded in the URL and request', async (context) => {
  const { document, complete, queryParameters, currentUrl } = await setup(context);
  const slug = 'x"&sort=name-desc';
  const label = '<img src=x onerror="alert(1)">';
  await complete(0, { data: [{ slug, label, isDefault: true }], meta: {} });
  assert.equal(document.querySelector('[data-category]').textContent, label);
  assert.equal(document.querySelector('[data-category]').dataset.category, slug);
  assert.ok(!document.querySelector('[onerror]'));
  assert.equal(currentUrl().searchParams.get('category'), slug);
  assert.equal(queryParameters(1).category, slug);
  assert.equal(queryParameters(1).sort, 'rating-desc');
});

test('unknown categories stay in the URL and expose the backend error on Library', async (context) => {
  const { document, complete, queryParameters, activeCategory, currentUrl } = await setup(
    context,
    '/Minigames/library?category=unknown&sort=invalid&page=-1',
  );
  await complete(0, catalog());
  assert.equal(activeCategory(), undefined);
  assert.deepEqual(queryParameters(1), {
    category: 'unknown',
    sort: 'rating-desc',
    page: '1',
    limit: '6',
  });
  await complete(1, { error: 'Invalid category parameter: unknown' }, 400);
  assert.equal(document.querySelector('h1').textContent, 'Game Library');
  assert.equal(listState(document), 'error');
  assert.equal(currentUrl().searchParams.get('category'), 'unknown');
  document.querySelector('[data-category="all"]').click();
  await complete(2, games([]));
  assert.equal(listState(document), 'empty');
});

test('keyboard sorting and outside dismissal keep the dropdown usable', async (context) => {
  const { document, window, complete, queryParameters } = await setup(
    context,
    '/Minigames/library?category=card',
  );
  await complete(0, catalog());
  await complete(1, games([]));
  const trigger = document.querySelector('.library-sort__trigger');
  const key = (target, value) =>
    target.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
    );
  trigger.focus();
  key(trigger, 'ArrowDown');
  assert.equal(document.activeElement.dataset.sortIndex, '1');
  key(document.activeElement, 'End');
  assert.equal(document.activeElement.dataset.sortIndex, '3');
  key(document.activeElement, 'Enter');
  assert.equal(queryParameters(2).sort, 'name-desc');
  assert.equal(document.activeElement, trigger);
  trigger.click();
  key(document.activeElement, 'Escape');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  trigger.click();
  document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('dialog-only query changes do not refetch the same Library list', async (context) => {
  const { window, calls, complete } = await setup(context);
  await complete(0, catalog());
  await complete(1, games([game('existing')]));
  window.history.pushState({}, '', '/Minigames/library?category=all&auth=login');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(calls.length, 2);
});

test('leaving Library cancels categories and ignores their late response', async (context) => {
  const { document, calls, complete } = await setup(context);
  document.querySelector('.header__logo').click();
  assert.ok(calls[0].options.signal.aborted);
  await complete(0, catalog());
  assert.match(document.querySelector('h1').textContent, /Take a Short Break/);
  assert.ok(!document.querySelector('[data-category]'));
  assert.equal(calls.length, 1);
});
