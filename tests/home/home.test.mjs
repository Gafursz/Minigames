import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { URL } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const game = (number, name = `API game ${number}`) => ({
  slug: `api-game-${number}`,
  name,
  category: 'puzzle',
  price: 'Free',
  shortDescription: 'A game from the backend.',
  rating: 4.8,
  likesCount: 1200,
  cardImage: '/assets/images/games/cat-mail-co-card.jpg',
});
const player = (rank, playerName = `API Player ${rank}`) => ({
  rank,
  playerName,
  gamesPlayed: 42,
  totalScore: 12_345,
  streakDays: 7,
  favoriteGameSlug: 'cat-mail-co',
  favoriteGameName: 'Cat Mail Co.',
});
const games = (data) => ({ data, meta: { appliedFilter: { featured: true } } });
const players = (data) => ({
  data,
  meta: { description: 'API weekly leaders', totalItems: data.length },
});

async function mount(context) {
  const modules = await import('./entry.ts');
  let page;

  const window = createBrowserDom(context);
  context.onTestFinished(() => {
    page?.destroy();
    modules.snackbar.destroy();
  });
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (url, options) =>
      new Promise((resolve, reject) => {
        calls.push({ url: new URL(url), options, resolve, reject });
      }),
  );
  page = new modules.HomePage();
  window.document.querySelector('#app').innerHTML = page.render();
  page.bindEvents();
  const complete = async (index, body, status = 200) => {
    calls[index].resolve(globalThis.Response.json(body, { status }));
    await nextTurn();
  };
  return { ...modules, window, document: window.document, page, calls, complete };
}

const state = (document, selector) => document.querySelector(selector).dataset.feedbackState;
const sliderRegion = '.slider__content';
const leaderboardRegion = '.leaderboard-section__content';

test('requests both public endpoints independently and renders server values and order', async (context) => {
  const app = await mount(context);
  const { document, calls, complete, getApiGameCardImage } = app;
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.pathname, '/api/games');
  assert.equal(calls[0].url.search, '?featured=true');
  assert.equal(calls[1].url.pathname, '/api/leaderboard');
  assert.equal(calls[1].url.search, '');
  for (const call of calls) {
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.credentials, 'omit');
    assert.deepEqual(call.options.headers, { Accept: 'application/json' });
  }
  assert.equal(state(document, sliderRegion), 'loading');
  assert.equal(state(document, leaderboardRegion), 'loading');
  assert.equal(
    document.querySelectorAll('.feedback-skeleton--slider .feedback-skeleton__item').length,
    3,
  );
  assert.equal(
    document.querySelectorAll('.feedback-skeleton--leaderboard .feedback-skeleton__item').length,
    5,
  );
  assert.ok(document.querySelector('.slider__control--next').disabled);
  await complete(1, players([player(3), player(1)]));
  assert.equal(state(document, sliderRegion), 'loading');
  assert.equal(state(document, leaderboardRegion), 'ready');
  assert.deepEqual(
    [...document.querySelectorAll('.leaderboard__rank')].map((node) => node.textContent.trim()),
    ['#3', '#1'],
  );
  assert.match(document.querySelector('.leaderboard').textContent, /12,345/);
  assert.match(document.querySelector('.leaderboard').textContent, /42/);
  assert.match(document.querySelector('.leaderboard').textContent, /7 days/);
  assert.match(document.querySelector('.leaderboard').textContent, /Cat Mail Co\./);
  assert.equal(
    document.querySelector('.leaderboard-section__title-desktop').textContent,
    'API weekly leaders',
  );
  await complete(0, games([game(2, 'Server first'), game(1, 'Server second')]));
  assert.deepEqual(
    [...document.querySelectorAll('.game-card__title')].map((node) => node.textContent),
    ['Server first', 'Server second'],
  );
  const firstImage = document.querySelector('.game-card__image');
  assert.equal(
    firstImage.getAttribute('src'),
    getApiGameCardImage('/assets/images/games/cat-mail-co-card.jpg'),
  );
  assert.notEqual(firstImage.getAttribute('src'), 'undefined');
  assert.equal(document.querySelector('.game-card__trigger').dataset.gameDetails, 'api-game-2');
  assert.match(document.querySelector('.game-stats').textContent, /4\.8/);
  assert.match(document.querySelector('.game-stats').textContent, /1\.2K/);
  assert.equal(document.querySelector(sliderRegion).getAttribute('aria-busy'), 'false');
  assert.ok(!document.querySelector('.snackbar'));
});

test('escapes API text and attributes instead of creating markup', async (context) => {
  const { document, complete } = await mount(context);
  const malicious = '<img src=x onerror="alert(1)">';
  await complete(
    0,
    games([
      {
        ...game(1, malicious),
        slug: 'x" data-attack="yes',
        rating: malicious,
        likesCount: malicious,
      },
    ]),
  );
  await complete(
    1,
    players([{ ...player(1, malicious), rank: malicious, favoriteGameName: malicious }]),
  );
  assert.equal(document.querySelector('.game-card__title').textContent, malicious);
  assert.equal(document.querySelector('.leaderboard__player-name').textContent.trim(), malicious);
  assert.equal(
    document.querySelector('.leaderboard__favorite-badge').textContent.trim(),
    malicious,
  );
  assert.ok(!document.querySelector('[onerror], [data-attack], script'));
  assert.equal(
    document.querySelector('.game-card__trigger').dataset.gameDetails,
    'x" data-attack="yes',
  );
});

test('isolates an HTTP failure and retries only the failed section with error and success snackbars', async (context) => {
  const { document, calls, complete } = await mount(context);
  await complete(0, { error: 'Featured service unavailable' }, 503);
  await complete(1, players([player(1)]));
  assert.equal(state(document, sliderRegion), 'error');
  assert.equal(state(document, leaderboardRegion), 'ready');
  assert.match(document.querySelector(sliderRegion).textContent, /Featured service unavailable/);
  assert.ok(document.querySelector('.snackbar--error'));
  const retry = document.querySelector('.content-feedback__retry');
  retry.click();
  retry.click();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url.href, calls[0].url.href);
  assert.equal(state(document, sliderRegion), 'loading');
  assert.equal(state(document, leaderboardRegion), 'ready');
  await complete(2, games([game(1)]));
  assert.equal(state(document, sliderRegion), 'ready');
  assert.match(
    document.querySelector('.snackbar--success').textContent,
    /Featured games loaded successfully/,
  );
});

test('isolates a leaderboard network failure, then supports repeated retry and an empty recovery', async (context) => {
  const { document, calls, complete } = await mount(context);
  await complete(0, games([game(1)]));
  calls[1].reject(new TypeError('offline'));
  await nextTurn();
  assert.equal(state(document, sliderRegion), 'ready');
  assert.equal(state(document, leaderboardRegion), 'error');
  assert.match(document.querySelector(leaderboardRegion).textContent, /Check your connection/);
  document.querySelector('.content-feedback__retry').click();
  await complete(2, { error: 'Try later' }, 500);
  document.querySelector('.content-feedback__retry').click();
  assert.equal(calls[3].url.pathname, '/api/leaderboard');
  await complete(3, players([]));
  assert.equal(state(document, leaderboardRegion), 'empty');
  assert.ok(!document.querySelector('.content-feedback__retry'));
  assert.ok(document.querySelector('.snackbar--success'));
});

test('shows distinct empty states and keeps slider controls disabled', async (context) => {
  const { document, complete } = await mount(context);
  await complete(0, games([]));
  await complete(1, players([]));
  assert.equal(state(document, sliderRegion), 'empty');
  assert.equal(state(document, leaderboardRegion), 'empty');
  assert.ok(
    !document.querySelector(
      '.content-feedback--error, .content-feedback__retry, .game-card, .leaderboard__row',
    ),
  );
  assert.ok(document.querySelector('.slider__control--next').disabled);
  assert.ok(document.querySelector('.slider__control--previous').disabled);
});

test('rejects malformed successful payloads without substituting seeded data', async (context) => {
  const { document, complete } = await mount(context);
  await complete(0, { data: 'not a list' });
  await complete(1, { unexpected: [] });
  assert.equal(state(document, sliderRegion), 'error');
  assert.equal(state(document, leaderboardRegion), 'error');
  assert.equal(document.querySelectorAll('.content-feedback__retry').length, 2);
  assert.ok(!document.querySelector('.game-card, .leaderboard__row'));
});

test('aborts both requests on page disposal and ignores late success and failure', async (context) => {
  const { document, page, calls, complete } = await mount(context);
  page.destroy();
  assert.ok(calls.every((call) => call.options.signal.aborted));
  document.querySelector('#app').innerHTML = '<main>Next page</main>';
  await complete(0, games([game(1)]));
  calls[1].reject(new Error('late failure'));
  await nextTurn();
  assert.equal(document.querySelector('#app').textContent, 'Next page');
  assert.ok(!document.querySelector('.snackbar'));
});

test('carousel arrows wrap over the API list and dispose their old listeners', async (context) => {
  const { document, page, complete } = await mount(context);
  await complete(0, games(Array.from({ length: 12 }, (_, index) => game(index + 1))));
  await complete(1, players([]));
  const center = () =>
    document.querySelector('.slider__item[data-slot="0"] .game-card__title').textContent;
  assert.equal(center(), 'API game 1');
  const next = document.querySelector('.slider__control--next');
  const previous = document.querySelector('.slider__control--previous');
  next.click();
  assert.equal(center(), 'API game 2');
  previous.click();
  previous.click();
  assert.equal(center(), 'API game 12');
  assert.equal(document.querySelectorAll('.slider__item[aria-hidden="false"]').length, 5);
  assert.equal(document.querySelectorAll('.slider__item[aria-hidden="true"]').length, 7);
  const track = document.querySelector('.slider__track');
  const before = [...track.children].map((item) => item.dataset.slot);
  page.destroy();
  next.disabled = false;
  next.click();
  assert.deepEqual(
    [...track.children].map((item) => item.dataset.slot),
    before,
  );
});

test('a single returned game never creates a carousel timer', async (context) => {
  const { document, page, complete } = await mount(context);
  const timeout = vi.spyOn(globalThis, 'setTimeout');
  await complete(0, games([game(1)]));
  await complete(1, players([]));
  page.setDialogOpen(true);
  page.setDialogOpen(false);
  assert.ok(document.querySelector('.slider__control--next').disabled);
  assert.equal(timeout.mock.calls.filter((call) => call[1] === 4000).length, 0);
});

test('a dialog opened before the data arrives still pauses autoplay', async (context) => {
  const { page, document, complete } = await mount(context);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const timeout = vi.spyOn(globalThis, 'setTimeout');
  page.setDialogOpen(true);
  await complete(0, games([game(1), game(2)]));
  await complete(1, players([]));
  const timerCount = () => timeout.mock.calls.filter((call) => call[1] === 4000).length;
  assert.equal(timerCount(), 0);
  page.setDialogOpen(false);
  assert.equal(timerCount(), 1);
});

test('image resolution honors the API path and rejects unsafe or unknown paths', async () => {
  const { getApiGameCardImage } = await import('./entry.ts');
  assert.ok(getApiGameCardImage('/assets/images/games/cat-mail-co-card.jpg'));
  assert.equal(getApiGameCardImage('/assets/images/games/missing-card.jpg'), undefined);
  assert.equal(getApiGameCardImage('javascript:alert(1)'), undefined);
  assert.equal(getApiGameCardImage('https://user:password@example.com/image.jpg'), undefined);
  assert.equal(getApiGameCardImage('//example.com/image.jpg'), undefined);
  assert.equal(
    getApiGameCardImage('https://images.example.com/image.jpg'),
    'https://images.example.com/image.jpg',
  );
});

test('a newer resource load wins even if an aborted request resolves last', async (context) => {
  const { HomeResource, snackbar } = await import('./entry.ts');
  let resource;

  const window = createBrowserDom(context, '<div id="resource"></div>');
  context.onTestFinished(() => {
    resource?.destroy();
    snackbar.destroy();
  });
  const pending = [];
  const root = window.document.querySelector('#resource');
  resource = new HomeResource(root, {
    request: (signal) =>
      new Promise((resolve) => {
        pending.push({ resolve, signal });
      }),
    isEmpty: (data) => data.length === 0,
    render: (data) => `<p>${data[0]}</p>`,
    layout: 'slider',
    label: 'Featured games',
    emptyMessage: 'No games',
  });
  const oldLoad = resource.load();
  const newLoad = resource.load();
  assert.ok(pending[0].signal.aborted);
  pending[1].resolve(['new result']);
  await newLoad;
  pending[0].resolve(['stale result']);
  await oldLoad;
  assert.equal(root.textContent, 'new result');
});
