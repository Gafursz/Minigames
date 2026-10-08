import { expect, test, vi } from 'vitest';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { URL } from 'node:url';
import { App } from '../../src/app/app';
import { APP_SESSION_KEY, APP_SESSION_DURATION } from '../../src/auth/app-session';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const profile = { displayName: 'Alex99', email: 'alex@example.com' };

async function setup(context, mode = 'login', savedSession) {
  const window = createBrowserDom(
    context,
    '<div id="app"></div>',
    `/Minigames/library${mode ? `?auth=${mode}` : ''}`,
  );
  vi.stubGlobal('KeyboardEvent', window.KeyboardEvent);
  const { document, localStorage } = window;
  localStorage.setItem('unrelated-app', 'keep');
  if (savedSession) localStorage.setItem(APP_SESSION_KEY, JSON.stringify(savedSession));
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (target) => {
    const url = new URL(target);
    const data = url.pathname.endsWith('/categories')
      ? { data: [{ slug: 'all', label: 'All', isDefault: true }] }
      : {
          data: [],
          meta: {
            page: 1,
            limit: 6,
            totalItems: 0,
            totalPages: 0,
            appliedFilter: { category: 'all', sort: 'rating-desc' },
          },
        };
    return globalThis.Response.json(data);
  });
  const auth = {
    login: vi.fn().mockResolvedValue(profile),
    register: vi.fn().mockResolvedValue(profile),
    logout: vi.fn().mockResolvedValue(),
  };
  const app = new App(document.querySelector('#app'), auth);
  context.onTestFinished(() => app.destroy());
  app.render();
  await nextTurn();
  const fill = (fields, formMode = mode) => {
    for (const [field, value] of Object.entries(fields)) {
      const input = document.querySelector(`#auth-${formMode}-${field}`);
      input.value = value;
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    }
  };
  const submit = (formMode = mode) => {
    document
      .querySelector(`#auth-${formMode}-panel`)
      .querySelector('form')
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  };
  const url = () => new URL(window.location.href);
  return { app, window, document, auth, localStorage, fill, submit, url };
}

test('pending login locks actions, prevents duplicate submission and dismissal, and keeps the auth route', async (context) => {
  const { document, window, auth, fill, submit, url } = await setup(context);
  const pending = Promise.withResolvers();
  auth.login.mockReturnValue(pending.promise);
  const dialog = document.querySelector('#auth-dialog');
  fill({ email: profile.email, password: 'abcdef' });
  submit();
  await nextTurn();
  for (const control of dialog.querySelectorAll('input, button'))
    expect(control.disabled).toBe(true);
  expect(dialog.querySelector('form').getAttribute('aria-busy')).toBe('true');
  expect(dialog.querySelector('.auth-dialog__status').textContent).toBe('Signing in…');
  expect(auth.login).toHaveBeenCalledExactlyOnceWith(profile.email, 'abcdef');
  submit();
  dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
  dialog.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: -1 }));
  dialog.querySelector('a[data-auth-switch]').click();
  dialog
    .querySelector('[role="tablist"]')
    .dispatchEvent(
      new window.KeyboardEvent('keydown', { bubbles: true, key: 'End', cancelable: true }),
    );
  window.history.pushState({}, '', '/Minigames/library?auth=register');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  await nextTurn();
  expect(dialog.open).toBe(true);
  expect(dialog.dataset.mode).toBe('login');
  expect(url().searchParams.get('auth')).toBe('login');
  expect(auth.login).toHaveBeenCalledOnce();
  pending.resolve(profile);
  await nextTurn();
  expect(dialog.open).toBe(false);
});

test('invalid submit makes no auth call; provider error unlocks the form and valid retry succeeds', async (context) => {
  const { document, auth, localStorage, fill, submit, url } = await setup(context);
  submit();
  await nextTurn();
  expect(auth.login).not.toHaveBeenCalled();
  auth.login.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
  fill({ email: profile.email, password: 'abcdef' });
  submit();
  await nextTurn();
  const dialog = document.querySelector('#auth-dialog');
  expect(dialog.open).toBe(true);
  expect(dialog.querySelector('[type="submit"]').disabled).toBe(false);
  expect(dialog.querySelector('#auth-login-email').value).toBe(profile.email);
  expect(dialog.querySelector('.auth-dialog__status').textContent).toMatch(/email or password/i);
  expect(document.querySelector('.snackbar--error').hidden).toBe(false);
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  submit();
  await nextTurn();
  expect(auth.login).toHaveBeenCalledTimes(2);
  expect(dialog.open).toBe(false);
  expect(url().searchParams.has('auth')).toBe(false);
  expect(document.querySelector('.snackbar--success').hidden).toBe(false);
  const saved = JSON.parse(localStorage.getItem(APP_SESSION_KEY));
  expect(saved).toEqual({ ...profile, authenticatedAt: expect.any(Number) });
  expect(localStorage.getItem('unrelated-app')).toBe('keep');
  for (const header of document.querySelectorAll('[data-header-profile]')) {
    expect(header.hidden).toBe(false);
    expect(header.querySelector('[data-profile-name]').textContent).toBe(profile.displayName);
  }
  for (const trigger of document.querySelectorAll('.header [data-auth-open]'))
    expect(trigger.hidden).toBe(true);
});

test('registration passes the username, email, and password, then logout restores guest controls', async (context) => {
  const { document, auth, localStorage, fill, submit } = await setup(context, 'register');
  fill({
    username: 'Alex99',
    email: profile.email,
    password: 'Abcd1!',
    'confirm-password': 'Abcd1!',
  });
  submit();
  await nextTurn();
  expect(auth.register).toHaveBeenCalledExactlyOnceWith('Alex99', profile.email, 'Abcd1!');
  expect(auth.login).not.toHaveBeenCalled();
  expect(document.querySelector('.snackbar__message').textContent).toMatch(/account is ready/);
  document.querySelector('[data-auth-logout]').click();
  await nextTurn();
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  expect(localStorage.getItem('unrelated-app')).toBe('keep');
  expect(document.querySelector('[data-header-profile]').hidden).toBe(true);
  expect(document.querySelector('.header__login').hidden).toBe(false);
  // One sign-out clears a previous Firebase identity at guest startup; one handles logout.
  expect(auth.logout).toHaveBeenCalledTimes(2);
});

test('stored profile restores without extending its time and focus detects expiration once', async (context) => {
  const authenticatedAt = Date.now() - 60_000;
  const { document, window, auth, localStorage } = await setup(context, '', {
    ...profile,
    displayName: '<b>Alex Player</b>',
    avatarUrl: 'https://example.com/avatar.jpg',
    authenticatedAt,
  });
  expect(document.querySelector('[data-profile-name]').textContent).toBe('<b>Alex Player</b>');
  expect(document.querySelector('[data-profile-name] b')).toBeNull();
  const photo = document.querySelector('[data-profile-photo]');
  const initials = document.querySelector('[data-profile-initials]');
  photo.dispatchEvent(new window.Event('load'));
  expect(photo.hidden).toBe(false);
  expect(initials.hidden).toBe(true);
  photo.dispatchEvent(new window.Event('error'));
  expect(photo.hidden).toBe(true);
  expect(initials.hidden).toBe(false);
  window.dispatchEvent(new window.Event('focus'));
  expect(JSON.parse(localStorage.getItem(APP_SESSION_KEY)).authenticatedAt).toBe(authenticatedAt);
  expect(auth.logout).not.toHaveBeenCalled();
  localStorage.setItem(
    APP_SESSION_KEY,
    JSON.stringify({
      ...profile,
      authenticatedAt: Date.now() - APP_SESSION_DURATION,
    }),
  );
  window.dispatchEvent(new window.Event('focus'));
  window.dispatchEvent(new window.Event('focus'));
  await nextTurn();
  expect(document.querySelector('[data-header-profile]').hidden).toBe(true);
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  expect(auth.logout).toHaveBeenCalledOnce();
  expect(document.querySelector('.snackbar__message').textContent).toMatch(/session expired/);
});

test('storage failure after Firebase success stays guest and explains how to retry', async (context) => {
  const { document, window, auth, localStorage, fill, submit } = await setup(context);
  vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage blocked');
  });
  fill({ email: profile.email, password: 'abcdef' });
  submit();
  await nextTurn();
  expect(document.querySelector('#auth-dialog').open).toBe(true);
  expect(document.querySelector('.auth-dialog__status').textContent).toMatch(
    /storage is unavailable/,
  );
  expect(document.querySelector('[data-header-profile]').hidden).toBe(true);
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  expect(auth.logout).toHaveBeenCalledTimes(2);
});

test('a late authentication result after app cleanup does not restore UI or persist a session', async (context) => {
  const { app, document, auth, localStorage, fill, submit } = await setup(context);
  const pending = Promise.withResolvers();
  auth.login.mockReturnValue(pending.promise);
  fill({ email: profile.email, password: 'abcdef' });
  submit();
  await nextTurn();
  app.destroy();
  pending.resolve(profile);
  await nextTurn();
  expect(localStorage.getItem(APP_SESSION_KEY)).toBeNull();
  expect(document.querySelector('#app').children).toHaveLength(0);
  expect(document.querySelector('.snackbar')).toBeNull();
  expect(auth.logout).toHaveBeenCalledTimes(2);
});
