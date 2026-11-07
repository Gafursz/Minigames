import { expect, test, vi } from 'vitest';
import { URL } from 'node:url';
import { once } from 'node:events';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { App } from '../../src/app/app';
import { APP_SESSION_KEY, APP_SESSION_DURATION } from '../../src/auth/app-session';
import { snackbar } from '../../src/components/snackbar';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const profile = { displayName: 'Alex99', email: 'alex@example.com' };
const gameUrl = '/Minigames/library?category=all&game=alpha&keep=yes#comments';
async function setup(context, path = gameUrl, stored) {
  const window = createBrowserDom(context, '<div id="app"></div>', path);
  vi.stubGlobal('KeyboardEvent', window.KeyboardEvent);
  const { document, localStorage } = window;
  if (stored !== undefined)
    localStorage.setItem(
      APP_SESSION_KEY,
      typeof stored === 'string' ? stored : JSON.stringify(stored),
    );
  localStorage.setItem('other-app', 'keep');
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (target, options) => {
    const url = new URL(target);
    calls.push({ url, method: options?.method ?? 'GET' });
    let response;
    if (url.pathname.endsWith('/categories'))
      response = { data: [{ slug: 'all', label: 'All', isDefault: true }] };
    else if (url.pathname.endsWith('/games/alpha'))
      response = {
        data: {
          slug: 'alpha',
          name: 'Alpha',
          fullDescription: 'Public description',
          heroImage: '',
          rating: 4,
          likesCount: 3,
          isLikedByCurrentUser: false,
          specs: { genre: 'Puzzle', players: 'Solo', duration: '5 min', price: 'Free' },
          topRecords: [],
        },
      };
    else if (url.pathname.endsWith('/comments'))
      response = {
        data: [
          {
            commentId: 'c1',
            isLikedByCurrentUser: false,
            authorName: 'Bob',
            text: 'Hello',
            createdAt: '2026-10-01T12:00:00Z',
            likesCount: 2,
          },
        ],
        meta: { totalComments: 1, returnedCount: 1, sort: 'newest' },
      };
    else
      response = {
        data: [],
        meta: {
          page: 1,
          limit: 6,
          totalItems: 0,
          totalPages: 0,
          appliedFilter: { category: 'all', sort: 'rating-desc' },
        },
      };
    return globalThis.Response.json(response);
  });
  const auth = {
    login: vi.fn().mockResolvedValue(profile),
    register: vi.fn().mockResolvedValue(profile),
    logout: vi.fn().mockResolvedValue(),
  };
  const app = new App(document.querySelector('#app'), auth, vi.fn().mockResolvedValue(profile));
  context.onTestFinished(() => app.destroy());
  const notices = vi.spyOn(snackbar, 'show');
  app.render();
  await nextTurn();
  const setUrl = async (target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await nextTurn();
  };
  const travel = async (direction) => {
    const event = once(window, 'popstate');
    window.history[direction]();
    await event;
    await nextTurn();
  };
  const closeAuth = async () => {
    document
      .querySelector('#auth-dialog')
      .dispatchEvent(new window.Event('cancel', { cancelable: true }));
    await nextTurn();
  };
  return { app, window, document, localStorage, calls, auth, notices, setUrl, travel, closeAuth };
}

for (const path of ['/Minigames/home/', '/Minigames/unknown']) {
  test(`valid session guards ${path} and removes only auth using replacement`, async (context) => {
    const before = `${path}?keep=a&auth=register&sort=odd#anchor`;
    const { window, document, notices } = await setup(context, before, {
      ...profile,
      authenticatedAt: Date.now(),
    });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      `${path}?keep=a&sort=odd#anchor`,
    );
    expect(document.querySelector('#auth-dialog').open).toBe(false);
    expect(window.history.length).toBe(1);
    expect(
      notices.mock.calls.filter(([message]) => message === 'You are already signed in.'),
    ).toHaveLength(1);
  });
}

test('hidden desktop and mobile auth triggers do not add history or lose game context', async (context) => {
  const { document, window, notices } = await setup(context, gameUrl, {
    ...profile,
    authenticatedAt: Date.now(),
  });
  const original = window.location.href;
  const length = window.history.length;
  document.querySelector('.header__login').click();
  await nextTurn();
  document.querySelector('.header__mobile-signup').click();
  await nextTurn();
  expect(window.location.href).toBe(original);
  expect(window.history.length).toBe(length);
  expect(document.querySelector('#game-details').open).toBe(true);
  expect(document.querySelector('#auth-dialog').open).toBe(false);
  expect(
    notices.mock.calls.filter(([message]) => message === 'You are already signed in.'),
  ).toHaveLength(2);
});

for (const stored of [
  '{broken',
  { ...profile, authenticatedAt: Date.now() - APP_SESSION_DURATION - 1000 },
]) {
  test(`invalid or expired storage allows Auth after recovery: ${typeof stored}`, async (context) => {
    const { document, localStorage, auth } = await setup(
      context,
      '/Minigames/library?auth=login',
      stored,
    );
    expect(document.querySelector('#auth-dialog').open).toBe(true);
    expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('keep');
    expect(auth.logout).toHaveBeenCalledOnce();
  });
}

test('guest action suspends one game dialog and restores its draft, DOM, scroll, URL, and history', async (context) => {
  const { document, window, calls, closeAuth, travel } = await setup(context);
  const game = document.querySelector('#game-details');
  const field = document.querySelector('.game-comments__input');
  field.value = 'Keep my draft';
  game.scrollTop = 120;
  const original = window.location.href;
  document.querySelector('.game-details__favorite').click();
  await nextTurn();
  expect(document.querySelectorAll('dialog[open]')).toHaveLength(1);
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  expect(new URL(window.location.href).searchParams.get('game')).toBe('alpha');
  await closeAuth();
  expect(game.open).toBe(true);
  expect(window.location.href).toBe(original);
  expect(document.querySelector('.game-comments__input')).toBe(field);
  expect(field.value).toBe('Keep my draft');
  expect(game.scrollTop).toBe(120);
  await travel('back');
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  await travel('forward');
  expect(game.open).toBe(true);
  expect(calls.filter(({ url }) => url.pathname.endsWith('/games/alpha'))).toHaveLength(1);
  expect(calls.every(({ method }) => method === 'GET')).toBe(true);
});

test('expiration before a protected action preserves draft, sends no mutation, and success restores authenticated game without retry', async (context) => {
  const { document, window, calls, localStorage, auth, travel } = await setup(context, gameUrl, {
    ...profile,
    authenticatedAt: Date.now(),
  });
  const field = document.querySelector('.game-comments__input');
  field.value = 'Do not automatically post';
  localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({ ...profile, authenticatedAt: Date.now() - APP_SESSION_DURATION }),
  );
  document
    .querySelector('.game-comments__form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  expect(document.querySelector('#game-details').dataset.authenticated).toBe('false');
  for (const [name, value] of [
    ['email', profile.email],
    ['password', 'abcdef'],
  ]) {
    const input = document.querySelector(`#auth-login-${name}`);
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  document
    .querySelector('#auth-login-panel form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  expect(auth.login).toHaveBeenCalledOnce();
  expect(document.querySelector('#game-details').open).toBe(true);
  expect(document.querySelector('#game-details').dataset.authenticated).toBe('true');
  expect(field.value).toBe('Do not automatically post');
  expect(calls.every(({ method }) => method === 'GET')).toBe(true);
  const length = window.history.length;
  await travel('back');
  expect(document.querySelector('#auth-dialog').open).toBe(false);
  expect(window.location.search).not.toContain('auth=');
  expect(window.history.length).toBe(length);
});

test('cross-tab login dismisses existing Auth while preserving the suspended game', async (context) => {
  const { document, window, localStorage } = await setup(
    context,
    `${gameUrl.replace('#comments', '')}&auth=login#comments`,
  );
  localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({ ...profile, authenticatedAt: Date.now() }),
  );
  window.dispatchEvent(new window.StorageEvent('storage', { key: APP_SESSION_KEY }));
  await nextTurn();
  expect(document.querySelector('#auth-dialog').open).toBe(false);
  expect(document.querySelector('#game-details').open).toBe(true);
  expect(window.location.hash).toBe('#comments');
});

test('logout keeps public game open, resets favorite state, and reports provider failure without restoring the session', async (context) => {
  const { document, localStorage, auth } = await setup(context, gameUrl, {
    ...profile,
    authenticatedAt: Date.now(),
  });
  document.querySelector('.game-details__favorite').setAttribute('aria-pressed', 'true');
  auth.logout.mockRejectedValueOnce(new Error('provider failed'));
  document.querySelector('.header__mobile-actions [data-auth-logout]').click();
  await nextTurn();
  expect(document.querySelector('#game-details').open).toBe(true);
  expect(document.querySelector('#game-details').dataset.authenticated).toBe('false');
  expect(document.querySelector('.game-details__favorite').getAttribute('aria-pressed')).toBe(
    'false',
  );
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  expect(localStorage.getItem('other-app')).toBe('keep');
  expect(document.querySelector('.snackbar__message').textContent).toContain(
    'provider sign-out failed',
  );
});

test('guest comment like uses the same guard without changing counts or sending a mutation', async (context) => {
  const { document, calls, closeAuth } = await setup(context);
  const like = document.querySelector('.game-comment__like');
  expect(like).not.toBeNull();
  const count = like.textContent;
  like.click();
  await nextTurn();
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  await closeAuth();
  expect(like.textContent).toBe(count);
  expect(calls.every(({ method }) => method === 'GET')).toBe(true);
});

test('cross-tab login during a pending request defers guarding until the request unlocks', async (context) => {
  const { document, window, localStorage, auth, setUrl } = await setup(
    context,
    '/Minigames/library?auth=login',
  );
  const pending = Promise.withResolvers();
  auth.login.mockReturnValue(pending.promise);
  for (const [name, value] of [
    ['email', profile.email],
    ['password', 'abcdef'],
  ]) {
    const input = document.querySelector(`#auth-login-${name}`);
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  document
    .querySelector('#auth-login-panel form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({ ...profile, authenticatedAt: Date.now() }),
  );
  window.dispatchEvent(new window.StorageEvent('storage', { key: APP_SESSION_KEY }));
  await setUrl('/Minigames/library?auth=register');
  expect(document.querySelector('#auth-dialog').dataset.mode).toBe('login');
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  pending.reject({ code: 'auth/network-request-failed' });
  await vi.waitFor(() => expect(document.querySelector('#auth-dialog').open).toBe(false));
  expect(window.location.search).not.toContain('auth=');
  expect(document.querySelector('[data-header-profile]').hidden).toBe(false);
});
