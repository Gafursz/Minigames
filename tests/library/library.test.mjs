import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { URL } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const game = (number, changes = {}) => ({
  slug: `server-game-${number}`,
  name: `Server game ${number}`,
  category: 'puzzle',
  price: 'Free',
  shortDescription: 'Description received from the API.',
  rating: 4.9,
  likesCount: 12_300,
  cardImage: '/assets/images/games/cat-mail-co-card.jpg',
  ...changes,
});
const response = (data) => ({
  data,
  meta: {
    page: 1,
    limit: 6,
    totalItems: data.length,
    totalPages: 1,
    appliedFilter: { category: 'all', sort: 'rating-desc' },
  },
});

async function setup(context) {
  const modules = await import('./entry.ts');
  const owned = [];

  const window = createBrowserDom(context);
  context.onTestFinished(() => {
    for (const item of owned) item.destroy();
    modules.snackbar.destroy();
  });
  const { document } = window;
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (url, options) =>
      new Promise((resolve, reject) => {
        calls.push({ url: new URL(url), options, resolve, reject });
      }),
  );
  const complete = async (index, body, status = 200) => {
    calls[index].resolve(globalThis.Response.json(body, { status }));
    await nextTurn();
  };
  const page = new modules.LibraryPage();
  owned.push(page);
  document.querySelector('#app').innerHTML = page.render();
  const root = document.querySelector('.library__cards');
  const list = new modules.LibraryGames(root);
  owned.push(list);
  return { ...modules, window, document, page, list, root, calls, complete, owned };
}

test('Library list requests limit=6 and renders exactly the returned items in backend order', async (context) => {
  const { list, root, document, calls, complete, getApiGameCardImage } = await setup(context);
  void list.load();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, '/api/games');
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), {
    category: 'all',
    sort: 'rating-desc',
    page: '1',
    limit: '6',
  });
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.method, 'GET');
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' });
  assert.equal(root.dataset.feedbackState, 'loading');
  assert.equal(root.getAttribute('aria-busy'), 'true');
  assert.equal(root.querySelectorAll('.feedback-skeleton__item').length, 6);
  assert.ok(!root.querySelector('.library-card'));
  // An oversized mock proves the UI does not slice/filter the backend result locally.
  const data = [game(7), game(2), game(5), game(1), game(6), game(3), game(4)];
  await complete(0, response(data));
  assert.equal(root.dataset.feedbackState, 'ready');
  assert.equal(root.getAttribute('aria-busy'), 'false');
  assert.deepEqual(
    [...root.querySelectorAll('.library-card__title')].map((node) => node.textContent),
    data.map((item) => item.name),
  );
  assert.match(
    root.querySelector('.library-card__description').textContent,
    /received from the API/,
  );
  assert.equal(root.querySelector('.library-card__category').textContent, 'Puzzle');
  assert.equal(root.querySelector('.library-card__price--free').textContent, 'Free');
  assert.match(root.querySelector('.game-stats').textContent, /4\.9/);
  assert.match(root.querySelector('.game-stats').textContent, /12\.3K/);
  assert.equal(
    root.querySelector('.library-card__image').getAttribute('src'),
    getApiGameCardImage(data[0].cardImage),
  );
  assert.equal(root.querySelector('.library-card__details').dataset.gameDetails, 'server-game-7');
  assert.equal(document.querySelectorAll('.header').length, 1);
  assert.equal(document.querySelectorAll('.footer').length, 1);
  assert.ok(!document.querySelector('.snackbar'));
});

test('API strings remain text and unavailable images use a safe placeholder', async (context) => {
  const { list, root, complete } = await setup(context);
  const loading = list.load();
  const literal = '<img src=x onerror="alert(1)">';
  await complete(
    0,
    response([
      game(1, {
        name: literal,
        slug: 'x" data-injected="yes',
        category: literal,
        shortDescription: literal,
        price: literal,
        cardImage: 'javascript:alert(1)',
      }),
    ]),
  );
  await loading;
  assert.equal(root.querySelector('.library-card__title').textContent, literal);
  assert.equal(root.querySelector('.library-card__description').textContent, literal);
  assert.equal(root.querySelector('.library-card__price').textContent, literal);
  assert.equal(
    root.querySelector('.library-card__details').dataset.gameDetails,
    'x" data-injected="yes',
  );
  assert.ok(root.querySelector('.library-card__image--placeholder'));
  assert.ok(!root.querySelector('img[onerror], [data-injected], script'));
  assert.ok(!root.querySelector('img.library-card__image'));
});

test('an empty successful response shows Data Not Found instead of an error or seeded cards', async (context) => {
  const { list, root, complete, document } = await setup(context);
  const loading = list.load();
  await complete(0, response([]));
  await loading;
  assert.equal(root.dataset.feedbackState, 'empty');
  assert.match(root.textContent, /Data Not Found/);
  assert.equal(root.querySelector('.content-feedback--empty').getAttribute('role'), 'status');
  assert.ok(
    !root.querySelector('.library-card, .content-feedback__retry, .content-feedback--error'),
  );
  assert.ok(!document.querySelector('.snackbar'));
});

test('HTTP failure and duplicate Retry clicks repeat the captured request once', async (context) => {
  const { list, root, calls, complete, document } = await setup(context);
  const query = { category: 'card', sort: 'name-desc', page: 3 };
  const loading = list.load(query);
  query.category = 'puzzle';
  query.page = 1;
  await complete(0, { error: 'Service unavailable <b>temporarily</b>' }, 503);
  await loading;
  assert.equal(root.dataset.feedbackState, 'error');
  assert.match(root.textContent, /Service unavailable <b>temporarily<\/b>/);
  assert.ok(!root.querySelector('b'));
  assert.ok(document.querySelector('.snackbar--error'));
  const retry = root.querySelector('.content-feedback__retry');
  retry.click();
  retry.click();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.href, calls[0].url.href);
  assert.equal(root.dataset.feedbackState, 'loading');
  await complete(1, response([game(1)]));
  assert.equal(root.dataset.feedbackState, 'ready');
  assert.ok(document.querySelector('.snackbar--success'));
  retry.click();
  assert.equal(calls.length, 2);
});

test('a network failure can be retried again after another failure and recover to empty data', async (context) => {
  const { list, root, calls, complete, document } = await setup(context);
  const loading = list.load();
  calls[0].reject(new TypeError('offline'));
  await loading;
  assert.match(root.textContent, /Check your connection/);
  root.querySelector('.content-feedback__retry').click();
  await complete(1, { error: 'Try later' }, 500);
  assert.equal(root.dataset.feedbackState, 'error');
  root.querySelector('.content-feedback__retry').click();
  await complete(2, response([]));
  assert.equal(root.dataset.feedbackState, 'empty');
  assert.ok(document.querySelector('.snackbar--success'));
});

test('malformed collections or card fields produce an error without partial cards', async (context) => {
  const { list, root, calls, complete } = await setup(context);
  const invalid = [
    JSON.parse('null'),
    {},
    { data: 'wrong' },
    response([game(1), { name: 'Incomplete' }]),
    response([game(1, { rating: '4.9' })]),
  ];
  for (const payload of invalid) {
    const loading = list.load();
    await complete(calls.length - 1, payload);
    await loading;
    assert.equal(root.dataset.feedbackState, 'error');
    assert.ok(root.querySelector('.content-feedback__retry'));
    assert.ok(!root.querySelector('.library-card'));
  }
});

test('a newer load wins when an aborted request resolves after the latest response', async (context) => {
  const { list, root, calls, complete } = await setup(context);
  const first = list.load({ category: 'puzzle', sort: 'rating-desc', page: 1 });
  const latest = list.load({ category: 'card', sort: 'rating-asc', page: 2 });
  assert.ok(calls[0].options.signal.aborted);
  assert.ok(!calls[1].options.signal.aborted);
  await complete(1, response([game(2)]));
  await latest;
  await complete(0, response([game(1)]));
  await first;
  assert.equal(root.querySelector('.library-card__title').textContent, 'Server game 2');
});

test('a superseded failure cannot replace new content or show an error Snackbar', async (context) => {
  const { list, root, calls, complete, document } = await setup(context);
  const old = list.load();
  const latest = list.load();
  await complete(1, response([game(2)]));
  await latest;
  calls[0].reject(new Error('late network error'));
  await old;
  assert.equal(root.dataset.feedbackState, 'ready');
  assert.ok(!document.querySelector('.snackbar'));
});

test('page teardown cancels requests and prevents late updates on another page', async (context) => {
  const { page, document, calls, complete } = await setup(context);
  page.bindEvents();
  page.destroy();
  assert.ok(calls[0].options.signal.aborted);
  document.querySelector('#app').innerHTML = '<main>Another page</main>';
  await complete(0, response([game(1)]));
  assert.equal(document.querySelector('#app').textContent, 'Another page');
  assert.ok(!document.querySelector('.snackbar'));
});

test('a destroyed list ignores later loads and detaches its Retry listener', async (context) => {
  const { list, root, calls, complete } = await setup(context);
  const loading = list.load();
  await complete(0, { error: 'Unavailable' }, 500);
  await loading;
  const retry = root.querySelector('.content-feedback__retry');
  list.destroy();
  retry.click();
  await list.load();
  assert.equal(calls.length, 1);
  assert.ok(!root.hasAttribute('aria-busy'));
});
