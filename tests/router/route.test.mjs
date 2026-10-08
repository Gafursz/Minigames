import assert from 'node:assert/strict';
import { test } from 'vitest';
import { URL } from 'node:url';
import {
  getAppPath,
  normalizeBase,
  pageHref,
  readRoute,
  withQuery,
} from '../../src/router/route.ts';

const origin = 'https://example.test';
const read = (path, base = '/Minigames/') => readRoute(new URL(path, origin), base);

test('supports the project base, home aliases, library, and trailing slashes', () => {
  for (const path of ['/Minigames', '/Minigames/', '/Minigames/home', '/Minigames/home/']) {
    const route = read(path);
    assert.equal(route.page, 'home');
    assert.equal(route.url.pathname, '/Minigames/');
  }
  assert.equal(read('/Minigames/library/').url.pathname, '/Minigames/library');
  assert.equal(read('/Minigames/library').page, 'library');
  assert.equal(read('/library', '/').page, 'library');
  assert.equal(pageHref('home', '/'), '/');
  assert.equal(pageHref('library', '/Minigames'), '/Minigames/library');
});

test('keeps unknown paths as 404 routes, including malformed percent escapes', () => {
  for (const path of [
    '/Minigames/unknown',
    '/Minigames/page/abc',
    '/Minigames/%E0%A4%A',
    '/Minigames-other/library',
  ]) {
    const route = read(path);
    assert.equal(route.page, 'not-found');
    assert.equal(route.url.pathname, path);
  }
  assert.equal(getAppPath(new URL('/Minigames-other/library', origin), '/Minigames/'), undefined);
  assert.throws(() => normalizeBase('//other-host/'), TypeError);
});

test('preserves the query state for later API requests without mutating the input URL', () => {
  const input = new URL(
    '/Minigames/library?category=puzzle&sort=name-desc&page=3&ref=shared',
    origin,
  );
  const route = readRoute(input, '/Minigames/');
  assert.deepEqual(route.library, { category: 'puzzle', sort: 'name-desc', page: 3 });
  assert.equal(route.url.searchParams.get('ref'), 'shared');
  route.url.searchParams.set('page', '4');
  assert.equal(input.searchParams.get('page'), '3');
});

test('normalizes invalid pagination and sorting while preserving unknown categories for the API', () => {
  for (const page of ['0', '-1', '1.5', '2e3', 'abc', '9007199254740992']) {
    const route = read(`/Minigames/library?page=${page}&sort=invalid&category=unknown-category`);
    assert.deepEqual(route.library, { category: 'unknown-category', sort: 'rating-desc', page: 1 });
    assert.equal(route.url.searchParams.has('page'), false);
    assert.equal(route.url.searchParams.has('sort'), false);
  }
  assert.equal(read('/Minigames/library?page=002').url.searchParams.get('page'), '2');
  assert.equal(read('/Minigames/library?category=').library.category, undefined);
});

test('migrates old hash links once and retains their query values', () => {
  const route = read('/Minigames/?ref=shared#/library?category=puzzle&page=2');
  assert.equal(route.page, 'library');
  assert.equal(route.url.hash, '');
  assert.equal(route.url.searchParams.get('ref'), 'shared');
  assert.deepEqual(route.library, { category: 'puzzle', sort: 'rating-desc', page: 2 });
  assert.equal(read('/Minigames/#/unknown').page, 'not-found');
  assert.equal(read('/Minigames/#submit-game').url.hash, '#submit-game');
});

test('parses game and auth URLs without turning an unknown game into a page 404', () => {
  assert.deepEqual(read('/Minigames/library?game=missing-game').dialog, {
    kind: 'game',
    slug: 'missing-game',
  });
  const route = read('/Minigames/library?game=one&auth=register');
  assert.deepEqual(route.dialog, { kind: 'auth', mode: 'register' });
  assert.equal(route.url.searchParams.get('game'), 'one');
  assert.equal(read('/Minigames/?auth=invalid').dialog, undefined);
  assert.equal(read('/Minigames/unknown?game=one').dialog, undefined);
});

test('query updates preserve the base path, unrelated state, and encoded values', () => {
  const current = new URL(
    '/Minigames/library?category=puzzle&sort=name-asc&page=2&ref=shared',
    origin,
  );
  const open = withQuery(current, { game: 'cat-mail-co' });
  assert.equal(open.pathname, '/Minigames/library');
  assert.equal(open.searchParams.get('page'), '2');
  const closed = withQuery(open, { game: undefined });
  assert.equal(closed.href, current.href);
  const changed = withQuery(current, { category: 'a & b', page: 1 });
  assert.equal(changed.searchParams.get('category'), 'a & b');
  assert.equal(changed.searchParams.get('ref'), 'shared');
});
