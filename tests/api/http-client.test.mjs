import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, getJson, isAbortError } from '../../src/api/http-client.ts';

test('returns server data and sends a public GET with encoded query parameters', async (context) => {
  const body = { data: [], meta: { totalItems: 0 } };
  const controller = new globalThis.AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json(body),
  );

  const result = await getJson('games', {
    query: { category: 'a & b', page: '2' },
    signal: controller.signal,
  });

  assert.deepEqual(result, body);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url.origin, 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com');
  assert.equal(url.pathname, '/api/games');
  assert.equal(url.searchParams.get('category'), 'a & b');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(options.method, 'GET');
  assert.equal(options.credentials, 'omit');
  assert.deepEqual(options.headers, { Accept: 'application/json' });
  assert.equal(options.signal, controller.signal);
  assert.equal(options.body, undefined);
});

test('preserves a 404 and its server message for the Game Not Found state', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json({ error: 'Game not found: missing-game' }, { status: 404 }),
  );

  await assert.rejects(getJson('games/missing-game'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, 'http');
    assert.equal(error.status, 404);
    assert.equal(error.message, 'Game not found: missing-game');
    return true;
  });
});

test('preserves the rate-limit status and message without automatic retries', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json(
      { error: 'Rate limit exceeded. Try again in 42 seconds' },
      { status: 429 },
    ),
  );

  await assert.rejects(getJson('categories'), {
    name: 'ApiError',
    kind: 'http',
    status: 429,
    message: 'Rate limit exceeded. Try again in 42 seconds',
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('keeps the HTTP status when an error response is HTML rather than JSON', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () => new globalThis.Response('<h1>Bad Gateway</h1>', { status: 502 }),
  );

  await assert.rejects(getJson('leaderboard'), {
    name: 'ApiError',
    kind: 'http',
    status: 502,
    message: 'The request failed (HTTP 502). Please try again.',
  });
});

test('uses a readable fallback for a missing or unusable server error message', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch');

  for (const body of ['{}', '{"error":42}', '{"error":"  "}', 'null']) {
    fetchMock.mock.mockImplementation(async () => new globalThis.Response(body, { status: 500 }));

    await assert.rejects(getJson('games'), {
      kind: 'http',
      status: 500,
      message: 'The request failed (HTTP 500). Please try again.',
    });
  }
});

test('reports a connection failure separately from an HTTP error', async (context) => {
  const cause = new TypeError('Failed to fetch');
  context.mock.method(globalThis, 'fetch', async () => {
    throw cause;
  });

  await assert.rejects(getJson('games'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, 'network');
    assert.equal(error.status, undefined);
    assert.equal(error.cause, cause);
    return true;
  });
});

test('reports invalid JSON in a successful response as unreadable data', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () => new globalThis.Response('not valid JSON', { status: 200 }),
  );

  await assert.rejects(getJson('games'), {
    name: 'ApiError',
    kind: 'invalid-response',
    status: 200,
  });
});

test('cancels an in-flight request without converting cancellation to an API error', async (context) => {
  const controller = new globalThis.AbortController();
  context.mock.method(
    globalThis,
    'fetch',
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  );

  const pending = getJson('games', { signal: controller.signal });
  controller.abort();

  await assert.rejects(pending, (error) => {
    assert.equal(error, controller.signal.reason);
    assert.equal(isAbortError(error), true);
    assert.equal(error instanceof ApiError, false);
    return true;
  });
});

test('preserves cancellation while reading either a success or an HTTP error body', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch');

  for (const status of [200, 500]) {
    const controller = new globalThis.AbortController();
    const response = new globalThis.Response('{}', { status });
    context.mock.method(response, 'json', async () => {
      controller.abort();
      throw controller.signal.reason;
    });
    fetchMock.mock.mockImplementation(async () => response);

    await assert.rejects(getJson('games', { signal: controller.signal }), (error) => {
      assert.equal(error, controller.signal.reason);
      return true;
    });
  }
});

test('preserves a custom abort reason and handles an already-cancelled signal', async (context) => {
  const controller = new globalThis.AbortController();
  const reason = new Error('Navigated to another page');
  controller.abort(reason);
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signal.throwIfAborted();
  });

  await assert.rejects(
    getJson('games', { signal: controller.signal }),
    (error) => error === reason,
  );
});
