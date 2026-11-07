import { expect, test, vi } from 'vitest';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';
import { App } from '../../src/app/app.ts';
import { APP_SESSION_KEY } from '../../src/auth/app-session.ts';
import { profileKey } from '../../src/features/profile/player-progress.ts';

function setup(context, isSignedIn = true) {
  const window = createBrowserDom(context, '<div id="app"></div>', '/Minigames/profile');
  if (isSignedIn)
    window.localStorage.setItem(
      APP_SESSION_KEY,
      JSON.stringify({
        displayName: 'Gafur',
        email: 'gafur@example.com',
        authenticatedAt: Date.now(),
      }),
    );
  const auth = {
    logout: vi.fn(async () => {}),
    login: vi.fn(async () => ({ displayName: 'Gafur', email: 'gafur@example.com' })),
    register: vi.fn(async () => ({ displayName: 'Gafur', email: 'gafur@example.com' })),
  };
  const app = new App(window.document.querySelector('#app'), auth);
  context.onTestFinished(() => app.destroy());
  app.render();
  const save = () =>
    window.document
      .querySelector('.profile-settings')
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  return { window, document: window.document, app, save };
}

test('profile direct links show a sign-in entry for guests without creating player statistics', (context) => {
  const { document, window } = setup(context, false);
  expect(document.querySelector('h1').textContent).toContain('Sign in');
  expect(document.querySelector('.profile-settings')).toBeNull();
  document.querySelector('main [data-auth-open]').click();
  expect(window.location.search).toBe('?auth=login');
  expect(document.querySelector('#auth-dialog').open).toBe(true);
});

test('saves profile settings, updates header avatar, and restores them from local storage', async (context) => {
  const { document, window, save } = setup(context);
  document.querySelector('#profile-nickname').value = 'Gafurjon';
  const rocket = document.querySelector('[name="avatar"][value="rocket"]');
  rocket.checked = true;
  rocket.dispatchEvent(new window.Event('change', { bubbles: true }));
  save();
  await nextTurn();
  expect(document.querySelector('[data-profile-name]').textContent).toBe('Gafurjon');
  expect(document.querySelector('[data-profile-initials]').textContent).toBe('🚀');
  const stored = JSON.parse(window.localStorage.getItem(profileKey('gafur@example.com')));
  expect(stored.settings.nickname).toBe('Gafurjon');
  expect(stored.unlocked.personal).toBeGreaterThan(0);
  expect(document.querySelectorAll('.achievement--unlocked')).toHaveLength(1);
  expect(document.querySelector('[data-locale-select]')).toBeNull();
});

test('rejects invalid settings and treats user-supplied profile text as text', (context) => {
  const { document, save } = setup(context);
  document.querySelector('#profile-nickname').value = 'x';
  save();
  expect(document.querySelector('#profile-error').textContent).toContain('2–30');
  document.querySelector('#profile-nickname').value = '<img src=x onerror=alert(1)>';
  document.querySelector('#profile-bio').value = '<script>alert(1)</script>';
  save();
  expect(document.querySelector('[data-profile-preview-name] img')).toBeNull();
  expect(document.querySelectorAll('main script')).toHaveLength(0);
});

test('sign-out and expiry remove the private profile view but retain its saved progress', async (context) => {
  const { document, window } = setup(context);
  const before = window.localStorage.getItem(profileKey('gafur@example.com'));
  document.querySelector('[data-auth-logout]').click();
  await nextTurn();
  expect(document.querySelector('.profile-settings')).toBeNull();
  expect(document.querySelector('.profile-guest')).not.toBeNull();
  expect(window.localStorage.getItem(profileKey('gafur@example.com'))).toBe(before);
});

test('reset confirmation supports cancel and clears only local extension progress when confirmed', (context) => {
  const { document, window, save } = setup(context);
  document.querySelector('#profile-nickname').value = 'Gafurjon';
  save();
  document.querySelector('[data-profile-reset]').click();
  const confirmation = document.querySelector('.profile-confirm');
  confirmation.returnValue = 'cancel';
  confirmation.close();
  expect(document.querySelector('#profile-nickname').value).toBe('Gafurjon');
  document.querySelector('[data-profile-reset]').click();
  confirmation.returnValue = 'clear';
  confirmation.close();
  expect(document.querySelector('#profile-nickname').value).toBe('');
  expect(window.localStorage.getItem(profileKey('gafur@example.com'))).toBeNull();
  expect(window.localStorage.getItem(APP_SESSION_KEY)).not.toBeNull();
});

function mockGameApi(isRejected = false) {
  let isFavorited = false;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (target, options = {}) => {
    const url = new globalThis.URL(target);
    if (options.method === 'POST') {
      if (isRejected) return globalThis.Response.json({ error: 'Test rejection' }, { status: 500 });
      if (url.pathname.endsWith('/favorite')) {
        isFavorited = !isFavorited;
        return globalThis.Response.json({ data: { isFavorited, likesCount: Number(isFavorited) } });
      }
      return globalThis.Response.json({ data: {} }, { status: 201 });
    }
    if (url.pathname.endsWith('/comments'))
      return globalThis.Response.json({
        data: [],
        meta: { totalComments: 0, returnedCount: 0, sort: 'newest' },
      });
    return globalThis.Response.json({
      data: {
        slug: 'alpha',
        name: 'Alpha',
        heroImage: '',
        rating: 4,
        likesCount: Number(isFavorited),
        isLikedByCurrentUser: isFavorited,
        fullDescription: 'A server-owned description',
        specs: { genre: 'Puzzle', players: 'Solo', duration: '5 minutes', price: 'Free' },
        topRecords: [],
      },
    });
  });
}

async function openGame(document) {
  const link = document.createElement('a');
  link.href = '/Minigames/profile?game=alpha';
  link.dataset.routerLink = '';
  document.querySelector('main').append(link);
  link.click();
  await nextTurn();
}

test('real detail views and server-confirmed favorites and comments update the correct player', async (context) => {
  const { document, window } = setup(context);
  mockGameApi();
  await openGame(document);
  expect(document.querySelector('[data-profile-statistics] dd').textContent).toBe('1');
  document.querySelector('.game-details__favorite').click();
  await nextTurn();
  const input = document.querySelector('.game-comments__input');
  input.value = 'A thoughtful comment';
  document
    .querySelector('.game-comments__form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  const stored = JSON.parse(window.localStorage.getItem(profileKey('gafur@example.com')));
  expect(stored.explored).toEqual(['alpha']);
  expect(stored.favorites).toEqual(['alpha']);
  expect(stored.comments).toBe(1);
  expect(stored.history.map((item) => item.kind)).toEqual(['comment', 'favorite', 'view']);
  expect(stored.unlocked.voice).toBeGreaterThan(0);
});

test('rejected mutations never earn comment or collector progress', async (context) => {
  const { document, window } = setup(context);
  mockGameApi(true);
  await openGame(document);
  document.querySelector('.game-details__favorite').click();
  await nextTurn();
  document.querySelector('.game-comments__input').value = 'A comment that fails';
  document
    .querySelector('.game-comments__form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  const stored = JSON.parse(window.localStorage.getItem(profileKey('gafur@example.com')));
  expect(stored.favorites).toEqual([]);
  expect(stored.comments).toBe(0);
  expect(stored.history.map((item) => item.kind)).toEqual(['view']);
});

test('expired sessions hide the profile and account changes load separate saved progress', async (context) => {
  const { document, window, save } = setup(context);
  document.querySelector('#profile-nickname').value = 'First player';
  save();
  window.localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({
      displayName: 'Second player',
      email: 'other@example.com',
      authenticatedAt: Date.now(),
    }),
  );
  window.dispatchEvent(new window.Event('focus'));
  await nextTurn();
  expect(document.querySelector('[data-profile-preview-name]').textContent).toBe('Second player');
  expect(document.querySelector('#profile-nickname').value).toBe('');
  window.localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({
      displayName: 'Second player',
      email: 'other@example.com',
      authenticatedAt: Date.now() - 300_000,
    }),
  );
  window.dispatchEvent(new window.Event('focus'));
  await nextTurn();
  expect(document.querySelector('.profile-guest')).not.toBeNull();
  const firstPlayer = JSON.parse(window.localStorage.getItem(profileKey('gafur@example.com')));
  expect(firstPlayer.settings.nickname).toBe('First player');
});

test('signing in from Profile completes the dialog flow and shows the authenticated dashboard', async (context) => {
  const { document, window } = setup(context, false);
  document.querySelector('main [data-auth-open]').click();
  document.querySelector('#auth-login-email').value = 'gafur@example.com';
  document.querySelector('#auth-login-password').value = 'Abcd12!';
  document
    .querySelector('#auth-login-panel form')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTurn();
  expect(window.location.search).toBe('');
  expect(document.querySelector('#auth-dialog').open).toBe(false);
  expect(document.querySelector('.profile-settings')).not.toBeNull();
  expect(document.querySelector('[data-profile-preview-name]').textContent).toBe('Gafur');
});
