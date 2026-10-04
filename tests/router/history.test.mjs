import assert from 'node:assert/strict';
import test from 'node:test';
import { URL } from 'node:url';
import { Router } from '../../src/router/router.ts';

class BrowserHistory {
  entries;
  position = 0;
  pushes = 0;
  replacements = 0;
  listeners = new Set();
  history = {
    state: { preserved: true },
    pushState: (state, _title, url) => {
      this.entries.splice(this.position + 1);
      this.entries.push({ url: String(url), state });
      this.position += 1;
      this.history.state = state;
      this.pushes += 1;
    },
    replaceState: (state, _title, url) => {
      this.entries[this.position] = { url: String(url), state };
      this.history.state = state;
      this.replacements += 1;
    },
  };

  constructor(path = '/Minigames/') {
    this.entries = [{ url: new URL(path, 'https://example.test').href, state: this.history.state }];
  }

  get location() {
    return new URL(this.entries[this.position].url);
  }

  addEventListener(type, listener) {
    assert.equal(type, 'popstate');
    this.listeners.add(listener);
  }

  removeEventListener(type, listener) {
    assert.equal(type, 'popstate');
    this.listeners.delete(listener);
  }

  go(delta) {
    const position = this.position + delta;
    if (position < 0 || position >= this.entries.length) return;
    this.position = position;
    this.history.state = this.entries[position].state;
    for (const listener of this.listeners) listener(new globalThis.Event('popstate'));
  }
}

test('initial normalization replaces one entry, preserves state, and start is idempotent', () => {
  const environment = new BrowserHistory('/Minigames/?ref=shared#/library?page=01');
  const calls = [];
  const router = new Router(
    '/Minigames/',
    (route, reason) => {
      calls.push({ route, reason });
    },
    environment,
  );
  router.start();
  router.start();
  assert.equal(environment.entries.length, 1);
  assert.equal(environment.pushes, 0);
  assert.equal(environment.replacements, 1);
  assert.deepEqual(environment.history.state, { preserved: true });
  assert.equal(environment.location.pathname, '/Minigames/library');
  assert.equal(environment.location.search, '?ref=shared');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].reason, 'initial');
});

test('navigates pages without reload, ignores duplicates, and rejects outside targets', () => {
  const environment = new BrowserHistory();
  const calls = [];
  const router = new Router(
    '/Minigames/',
    (route) => {
      calls.push(route.page);
    },
    environment,
  );
  router.start();
  assert.equal(router.navigate('/Minigames/library/'), true);
  assert.equal(router.navigate('/Minigames/library'), false);
  for (const target of [
    'https://outside.test/Minigames/',
    '/Minigames-other/',
    'javascript:bad()',
    'http://[',
  ]) {
    assert.equal(router.navigate(target), false);
  }
  assert.equal(router.navigate('/Minigames/unknown'), true);
  assert.deepEqual(calls, ['home', 'library', 'not-found']);
  assert.equal(environment.entries.length, 3);
});

test('Back and Forward publish restored state without pushing more entries', () => {
  const environment = new BrowserHistory();
  const calls = [];
  const router = new Router(
    '/Minigames/',
    (route, reason) => {
      calls.push([route.page, reason]);
    },
    environment,
  );
  router.start();
  router.navigate('/Minigames/library?category=puzzle&page=2');
  environment.go(-1);
  environment.go(1);
  assert.deepEqual(calls, [
    ['home', 'initial'],
    ['library', 'navigate'],
    ['home', 'history'],
    ['library', 'history'],
  ]);
  assert.equal(router.current.library.page, 2);
  assert.equal(router.current.library.category, 'puzzle');
  assert.equal(environment.entries.length, 2);
  assert.equal(environment.pushes, 1);
  router.destroy();
  environment.go(-1);
  assert.equal(calls.length, 4);
  assert.equal(environment.listeners.size, 0);
});

test('query replacements preserve unrelated values and do not add a history entry', () => {
  const environment = new BrowserHistory('/Minigames/library?category=puzzle&page=3&ref=shared');
  const router = new Router('/Minigames/', () => {}, environment);
  router.start();
  router.updateQuery({ sort: 'name-desc', page: 1 }, true);
  assert.deepEqual(router.current.library, { category: 'puzzle', sort: 'name-desc', page: 1 });
  assert.equal(router.current.url.searchParams.get('ref'), 'shared');
  assert.equal(environment.entries.length, 1);
});

test('seven recorded open/close URL actions can be traversed backwards and forwards', () => {
  const environment = new BrowserHistory('/Minigames/library?category=puzzle&page=2');
  const games = [];
  const router = new Router(
    '/Minigames/',
    (route) => {
      games.push(route.dialog?.slug);
    },
    environment,
  );
  router.start();
  const states = [undefined, '1', undefined, '1', undefined, '2', undefined, '3'];
  for (const game of states.slice(1)) router.updateQuery({ game });
  assert.deepEqual(games, states);
  for (let index = states.length - 2; index >= 0; index -= 1) {
    environment.go(-1);
    assert.equal(router.current.dialog?.slug, states[index]);
    assert.equal(router.current.library.page, 2);
  }
  for (let index = 1; index < states.length; index += 1) {
    environment.go(1);
    assert.equal(router.current.dialog?.slug, states[index]);
  }
  assert.equal(environment.entries.length, 8);
  assert.equal(environment.pushes, 7);
  // This tests the shared history mechanism. Dialog UI wiring is a later feature.
});
