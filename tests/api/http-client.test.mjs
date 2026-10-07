import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { ApiError, getJson, isAbortError } from '../../src/api/http-client.ts';

test('returns server data and sends a public GET with encoded query parameters', async () => {
  const body = { data: [], meta: { totalItems: 0 } };
  const controller = new globalThis.AbortController();
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => globalThis.Response.json(body));

  const result = await getJson('games', {
    query: { category: 'a & b', page: '2' },
    signal: controller.signal,
  });

  assert.deepEqual(result, body);
  const [url, options] = fetchMock.mock.calls[0];
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

test('preserves a 404 and its server message for the Game Not Found state', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
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

test('preserves the rate-limit status and message without automatic retries', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () =>
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
  assert.equal(fetchMock.mock.calls.length, 1);
});

test('keeps the HTTP status when an error response is HTML rather than JSON', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () => new globalThis.Response('<h1>Bad Gateway</h1>', { status: 502 }),
  );

  await assert.rejects(getJson('leaderboard'), {
    name: 'ApiError',
    kind: 'http',
    status: 502,
    message: 'The request failed (HTTP 502). Please try again.',
  });
});

test('uses a readable fallback for a missing or unusable server error message', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');

  for (const body of ['{}', '{"error":42}', '{"error":"  "}', 'null']) {
    fetchMock.mockImplementation(async () => new globalThis.Response(body, { status: 500 }));

    await assert.rejects(getJson('games'), {
      kind: 'http',
      status: 500,
      message: 'The request failed (HTTP 500). Please try again.',
    });
  }
});

test('reports a connection failure separately from an HTTP error', async () => {
  const cause = new TypeError('Failed to fetch');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
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

test('reports invalid JSON in a successful response as unreadable data', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () => new globalThis.Response('not valid JSON', { status: 200 }),
  );

  await assert.rejects(getJson('games'), {
    name: 'ApiError',
    kind: 'invalid-response',
    status: 200,
  });
});

test('cancels an in-flight request without converting cancellation to an API error', async () => {
  const controller = new globalThis.AbortController();
  vi.spyOn(globalThis, 'fetch').mockImplementation(
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

test('preserves cancellation while reading either a success or an HTTP error body', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');

  for (const status of [200, 500]) {
    const controller = new globalThis.AbortController();
    const response = new globalThis.Response('{}', { status });
    vi.spyOn(response, 'json').mockImplementation(async () => {
      controller.abort();
      throw controller.signal.reason;
    });
    fetchMock.mockImplementation(async () => response);

    await assert.rejects(getJson('games', { signal: controller.signal }), (error) => {
      assert.equal(error, controller.signal.reason);
      return true;
    });
  }
});

test('preserves a custom abort reason and handles an already-cancelled signal', async () => {
  const controller = new globalThis.AbortController();
  const reason = new Error('Navigated to another page');
  controller.abort(reason);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, { signal }) => {
    signal.throwIfAborted();
  });

  await assert.rejects(
    getJson('games', { signal: controller.signal }),
    (error) => error === reason,
  );
});
