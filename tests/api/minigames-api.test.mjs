import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCategories,
  getFeaturedGames,
  getGameComments,
  getGameDetails,
  getLeaderboard,
  getLibraryGames,
} from '../../src/api/minigames-api.ts';

test('uses the public endpoint for each section and forwards its cancellation signal', async (context) => {
  const controller = new globalThis.AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json({ data: [] }),
  );
  const requests = [
    [() => getCategories(controller.signal), '/api/categories', {}],
    [() => getLeaderboard(controller.signal), '/api/leaderboard', {}],
    [() => getFeaturedGames(controller.signal), '/api/games', { featured: 'true' }],
    [
      () => getGameDetails('tukoni-forest-keepers', controller.signal),
      '/api/games/tukoni-forest-keepers',
      {},
    ],
    [
      () => getGameComments('tukoni-forest-keepers', controller.signal),
      '/api/games/tukoni-forest-keepers/comments',
      { limit: '3', sort: 'newest' },
    ],
  ];

  for (const [request, pathname, query] of requests) {
    await request();
    const [url, options] = fetchMock.mock.calls.at(-1).arguments;
    assert.equal(url.pathname, pathname);
    assert.deepEqual(Object.fromEntries(url.searchParams), query);
    assert.equal(options.signal, controller.signal);
    assert.equal(options.method, 'GET');
  }
});

test('sends category, sort, page and the required six-card limit together', async (context) => {
  const controller = new globalThis.AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json({ data: [], meta: { totalPages: 0 } }),
  );

  for (const sort of ['rating-desc', 'rating-asc', 'name-asc', 'name-desc']) {
    await getLibraryGames({ category: 'puzzle', sort, page: 2 }, controller.signal);
    const [url, options] = fetchMock.mock.calls.at(-1).arguments;
    assert.equal(url.pathname, '/api/games');
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      category: 'puzzle',
      sort,
      page: '2',
      limit: '6',
    });
    assert.equal(options.signal, controller.signal);
  }
});

test('keeps the server order, returned items, and pagination metadata unchanged', async (context) => {
  const body = {
    data: [{ slug: 'z-game' }, { slug: 'a-game' }],
    meta: {
      page: 2,
      limit: 6,
      totalItems: 8,
      totalPages: 2,
      appliedFilter: { category: 'card', sort: 'rating-desc' },
    },
  };
  context.mock.method(globalThis, 'fetch', async () => globalThis.Response.json(body));

  const result = await getLibraryGames({ category: 'card', sort: 'rating-desc', page: 2 });
  assert.deepEqual(result, body);
});

test('keeps an empty result and its page metadata as a successful response', async (context) => {
  const body = {
    data: [],
    meta: {
      page: 999,
      limit: 6,
      totalItems: 9,
      totalPages: 2,
      appliedFilter: { category: 'puzzle', sort: 'rating-desc' },
    },
  };
  context.mock.method(globalThis, 'fetch', async () => globalThis.Response.json(body));

  const result = await getLibraryGames({ category: 'puzzle', sort: 'rating-desc', page: 999 });
  assert.deepEqual(result, body);
});

test('preserves the total comment count independently of the returned list length', async (context) => {
  const body = {
    data: [{ commentId: 'first' }, { commentId: 'second' }, { commentId: 'third' }],
    meta: { totalComments: 12, returnedCount: 3, sort: 'newest' },
  };
  context.mock.method(globalThis, 'fetch', async () => globalThis.Response.json(body));

  const result = await getGameComments('tukoni-forest-keepers');
  assert.equal(result.data.length, 3);
  assert.equal(result.meta.totalComments, 12);
});

test('rejects invalid page numbers before sending a request', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch');

  for (const page of [0, -1, 1.5, NaN, Infinity, 1e20]) {
    await assert.rejects(
      getLibraryGames({ category: 'all', sort: 'rating-desc', page }),
      RangeError,
    );
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('rejects invalid slugs before they can change the API path', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch');

  for (const slug of ['', '..', '../categories', 'game?userEmail=test', 'not a slug']) {
    await assert.rejects(getGameDetails(slug), TypeError);
    await assert.rejects(getGameComments(slug), TypeError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
