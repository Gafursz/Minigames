import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { URL } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { bundleModule } from '../helpers/bundle.mjs';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const game = (slug) => ({
  slug,
  name: `API ${slug}`,
  category: 'puzzle',
  price: 'Free',
  shortDescription: 'API card',
  rating: 4.5,
  likesCount: 10,
  cardImage: '/assets/images/games/cat-mail-co-card.jpg',
});
const detail = (slug) => ({
  data: {
    slug,
    name: `API ${slug}`,
    heroImage: '/assets/images/games/cat-mail-co-hero.jpg',
    rating: 4.5,
    likesCount: 10,
    isLikedByCurrentUser: false,
    fullDescription: 'API description',
    specs: { genre: 'Puzzle', players: 'Solo', duration: '10 min', price: 'Free' },
    topRecords: [],
  },
});
async function setup(context, path = '/Minigames/library', shouldHoldDetails = false) {
  const modules = await bundleModule(context, 'tests/dialog-routing/entry.ts');
  let app;
  context.after(() => app?.destroy());
  const window = createBrowserDom(context, '<div id="app"></div>', path);
  for (const name of ['Node', 'KeyboardEvent']) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value: window[name] });
    context.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  const pauses = context.mock.method(modules.Slider.prototype, 'setDialogOpen');
  const calls = [];
  context.mock.method(globalThis, 'fetch', (target, options) => {
    const url = new URL(target);
    const call = { url, options };
    calls.push(call);
    let body;
    let status = 200;
    if (url.pathname.endsWith('/categories')) {
      body = {
        data: [
          { slug: 'all', label: 'All', isDefault: true },
          { slug: 'puzzle', label: 'Puzzle', isDefault: false },
        ],
      };
    } else if (url.pathname.endsWith('/comments')) {
      body = { data: [], meta: { totalComments: 0, returnedCount: 0, sort: 'newest' } };
    } else if (url.pathname.endsWith('/games')) {
      body = {
        data: ['alpha', 'beta', 'gamma'].map((slug) => game(slug)),
        meta: {
          page: Number(url.searchParams.get('page') ?? 1),
          limit: 6,
          totalItems: 18,
          totalPages: 3,
          appliedFilter: {
            category: url.searchParams.get('category') ?? 'all',
            sort: url.searchParams.get('sort') ?? 'rating-desc',
          },
        },
      };
    } else if (url.pathname.endsWith('/leaderboard')) {
      body = { data: [], meta: {} };
    } else {
      if (shouldHoldDetails)
        return new Promise((resolve, reject) => {
          call.resolve = resolve;
          call.reject = reject;
        });
      const slug = url.pathname.split('/').at(-1);
      body = slug === 'missing' ? { error: 'Game not found' } : detail(slug);
      if (slug === 'missing') status = 404;
    }
    return Promise.resolve(globalThis.Response.json(body, { status }));
  });
  const { document } = window;
  app = new modules.App(document.querySelector('#app'));
  app.render();
  await nextTurn();
  const url = () => new URL(window.location.href);
  const detailsCalls = () => calls.filter((call) => /\/games\/[^/]+$/.test(call.url.pathname));
  const listCalls = () =>
    calls.filter(
      (call) => call.url.pathname.endsWith('/games') && !call.url.searchParams.has('featured'),
    );
  const finishExits = () => {
    for (const dialog of document.querySelectorAll('dialog.is-closing')) {
      const event = new window.Event('animationend');
      Object.defineProperty(event, 'animationName', {
        value: dialog.id === 'game-details' ? 'game-details-exit' : 'auth-dialog-leave',
      });
      dialog.dispatchEvent(event);
    }
  };
  const navigateHistory = async (direction) => {
    const event = once(window, 'popstate');
    window.history[direction]();
    await event;
    await nextTurn();
    finishExits();
  };
  const setUrl = async (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await nextTurn();
  };
  const openGame = async (slug) => {
    const button = [...document.querySelectorAll('[data-game-details]')].find(
      (node) => node.dataset.gameDetails === slug,
    );
    assert.ok(button, `A card trigger exists for ${slug}`);
    button.click();
    await nextTurn();
  };
  const closeGame = () => {
    document.querySelector('.game-details__close').click();
    finishExits();
  };
  return {
    ...modules,
    app,
    window,
    document,
    calls,
    url,
    detailsCalls,
    listCalls,
    finishExits,
    navigateHistory,
    setUrl,
    openGame,
    closeGame,
    pauses,
  };
}

test('a shared Library game URL restores controls, page metadata, and the selected modal', async (context) => {
  const { document, url, detailsCalls, listCalls } = await setup(
    context,
    '/Minigames/library?category=puzzle&sort=name-desc&page=2&game=beta',
  );
  assert.equal(document.querySelector('main h1').textContent, 'Game Library');
  assert.equal(
    document.querySelector('[data-category][aria-pressed="true"]').dataset.category,
    'puzzle',
  );
  assert.equal(document.querySelector('.library-sort__label').textContent, 'Name Z→A');
  assert.equal(document.querySelector('.pagination [aria-current="page"]').dataset.page, '2');
  assert.ok(document.querySelector('#game-details').open);
  assert.equal(document.querySelector('.game-details__title').textContent, 'API beta');
  assert.equal(detailsCalls()[0].url.pathname, '/api/games/beta');
  assert.equal(listCalls()[0].url.searchParams.get('page'), '2');
  assert.equal(url().searchParams.get('game'), 'beta');
});

test('a Home auth deep link restores the requested mode without a full navigation', async (context) => {
  const { document, url } = await setup(context, '/Minigames/?auth=register');
  const auth = document.querySelector('#auth-dialog');
  assert.ok(auth.open);
  assert.equal(auth.dataset.mode, 'register');
  assert.equal(auth.querySelector('[aria-selected="true"]').dataset.authSwitch, 'register');
  assert.equal(auth.querySelector('#auth-register-panel').hidden, false);
  assert.equal(auth.querySelector('#auth-login-panel').hidden, true);
  assert.equal(document.activeElement, auth.querySelector('#auth-register-tab'));
  assert.equal(url().searchParams.get('auth'), 'register');
});

test('desktop auth triggers and Escape update the URL and restore focus', async (context) => {
  const { document, window, url, finishExits } = await setup(context);
  const button = document.querySelector('.header__login');
  const main = document.querySelector('main');
  button.click();
  const auth = document.querySelector('#auth-dialog');
  assert.ok(auth.open);
  assert.equal(url().searchParams.get('auth'), 'login');
  auth.dispatchEvent(new window.Event('cancel', { cancelable: true }));
  assert.ok(!url().searchParams.has('auth'));
  finishExits();
  assert.ok(!auth.open);
  assert.equal(document.activeElement, button);
  assert.equal(document.querySelector('main'), main);
});

test('mobile auth closes the menu immediately and returns focus to the burger', async (context) => {
  const { document, window, url, finishExits } = await setup(context);
  const burger = document.querySelector('.header__burger');
  burger.click();
  assert.equal(document.querySelector('.header__mobile-menu').hidden, false);
  document.querySelector('.header__mobile-signup').click();
  assert.equal(document.querySelector('.header__mobile-menu').hidden, true);
  assert.equal(burger.getAttribute('aria-expanded'), 'false');
  assert.equal(url().searchParams.get('auth'), 'register');
  document
    .querySelector('#auth-dialog')
    .dispatchEvent(new window.Event('cancel', { cancelable: true }));
  finishExits();
  assert.equal(document.activeElement, burger);
});

test('auth tabs, inline links, keyboard controls, and history share the same mode state', async (context) => {
  const { document, window, url, navigateHistory } = await setup(context, '/Minigames/?auth=login');
  const auth = document.querySelector('#auth-dialog');
  const email = auth.querySelector('#auth-login-email');
  email.value = 'learner@example.com';
  auth.querySelector('#auth-register-tab').click();
  assert.equal(url().searchParams.get('auth'), 'register');
  auth.querySelector(':scope #auth-register-panel [data-auth-switch="login"]').click();
  assert.equal(url().searchParams.get('auth'), 'login');
  assert.equal(email.value, 'learner@example.com');
  auth
    .querySelector('#auth-login-tab')
    .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(url().searchParams.get('auth'), 'register');
  await navigateHistory('back');
  assert.equal(auth.dataset.mode, 'login');
  await navigateHistory('forward');
  assert.equal(auth.dataset.mode, 'register');
  assert.ok(auth.open);
  assert.ok(!url().href.includes('learner'));
});

test('every game dismiss control clears only dialog URL state', async (context) => {
  const { document, window, url, openGame, finishExits, listCalls } = await setup(
    context,
    '/Minigames/library?category=puzzle&sort=name-asc&page=2&utm_source=test',
  );
  for (const action of ['button', 'escape', 'backdrop']) {
    await openGame('alpha');
    const dialog = document.querySelector('#game-details');
    if (action === 'button') document.querySelector('.game-details__close').click();
    else if (action === 'escape')
      dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
    else
      dialog.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, clientX: -10, clientY: -10 }),
      );
    assert.ok(!url().searchParams.has('game'));
    assert.equal(url().searchParams.get('category'), 'puzzle');
    assert.equal(url().searchParams.get('sort'), 'name-asc');
    assert.equal(url().searchParams.get('page'), '2');
    assert.equal(url().searchParams.get('utm_source'), 'test');
    finishExits();
    assert.ok(!dialog.open);
  }
  assert.equal(listCalls().length, 1);
});

test('seven Back and seven Forward steps replay every repeated open and close in order', async (context) => {
  const { openGame, closeGame, window, url, navigateHistory, document } = await setup(context);
  const initialLength = window.history.length;
  await openGame('alpha');
  closeGame();
  await openGame('alpha');
  closeGame();
  await openGame('beta');
  closeGame();
  await openGame('gamma');
  assert.equal(window.history.length, initialLength + 7);
  for (const expected of [undefined, 'beta', undefined, 'alpha', undefined, 'alpha', undefined]) {
    await navigateHistory('back');
    assert.equal(url().searchParams.get('game') ?? undefined, expected);
    assert.equal(document.querySelector('#game-details').open, Boolean(expected));
    if (expected)
      assert.equal(document.querySelector('.game-details__title').textContent, `API ${expected}`);
  }
  for (const expected of ['alpha', undefined, 'alpha', undefined, 'beta', undefined, 'gamma']) {
    await navigateHistory('forward');
    assert.equal(url().searchParams.get('game') ?? undefined, expected);
    assert.equal(document.querySelector('#game-details').open, Boolean(expected));
  }
  assert.equal(window.history.length, initialLength + 7);
});

test('duplicate dialog state does not refetch games or add a history entry', async (context) => {
  const { openGame, detailsCalls, listCalls, document, window } = await setup(context);
  await openGame('alpha');
  const length = window.history.length;
  await openGame('alpha');
  assert.equal(detailsCalls().length, 1);
  assert.equal(listCalls().length, 1);
  assert.equal(window.history.length, length);
  assert.ok(document.querySelector('#game-details').open);
});

test('unrelated URL changes keep auth input focus and values', async (context) => {
  const { document, setUrl } = await setup(context, '/Minigames/library?category=all&auth=login');
  const email = document.querySelector('#auth-login-email');
  email.value = 'learner@example.com';
  email.focus();
  await setUrl('/Minigames/library?category=all&auth=login&utm_source=test');
  assert.equal(document.activeElement, email);
  assert.equal(email.value, 'learner@example.com');
});

test('missing and malformed game URLs show modal not-found states over Library', async (context) => {
  const { document, setUrl, detailsCalls, url } = await setup(
    context,
    '/Minigames/library?category=all&game=missing',
  );
  assert.match(document.querySelector('.game-details__content').textContent, /Game Not Found/);
  assert.equal(document.querySelector('main h1').textContent, 'Game Library');
  assert.equal(url().searchParams.get('game'), 'missing');
  assert.equal(detailsCalls().length, 1);
  await setUrl('/Minigames/library?category=all&game=..%2Fbad');
  assert.match(document.querySelector('.game-details__content').textContent, /Game Not Found/);
  assert.equal(detailsCalls().length, 1);
});

test('unknown paths keep the dedicated 404 and return Home through the SPA', async (context) => {
  const { document, url, detailsCalls } = await setup(context, '/Minigames/unknown?game=alpha');
  assert.ok(document.querySelector('.header'));
  assert.ok(document.querySelector('.footer'));
  assert.ok(!document.querySelector('dialog[open]'));
  assert.equal(detailsCalls().length, 0);
  document.querySelector('main a[data-router-link]').click();
  await nextTurn();
  assert.equal(url().pathname, '/Minigames/');
  assert.ok(!url().searchParams.has('game'));
  assert.equal(document.title, 'MiniGames — Home');
});

test('conflicting auth/game parameters normalize to exactly one auth dialog', async (context) => {
  const { document, url, detailsCalls } = await setup(
    context,
    '/Minigames/library?category=all&game=alpha&auth=register',
  );
  assert.equal(document.querySelectorAll('dialog[open]').length, 1);
  assert.ok(document.querySelector('#auth-dialog').open);
  assert.ok(!url().searchParams.has('game'));
  assert.equal(detailsCalls().length, 0);
});

test('rapid game URL changes cancel old requests and render only the latest slug', async (context) => {
  const { setUrl, detailsCalls, document } = await setup(
    context,
    '/Minigames/library?category=all&game=alpha',
    true,
  );
  await setUrl('/Minigames/library?category=all&game=beta');
  const [old, current] = detailsCalls();
  assert.ok(old.options.signal.aborted);
  current.resolve(globalThis.Response.json(detail('beta')));
  await nextTurn();
  old.resolve(globalThis.Response.json(detail('alpha')));
  await nextTurn();
  assert.equal(document.querySelector('.game-details__title').textContent, 'API beta');
});

test('closing a pending game prevents late errors and Back restores a fresh request', async (context) => {
  const { closeGame, detailsCalls, document, navigateHistory, url } = await setup(
    context,
    '/Minigames/library?category=all&game=alpha',
    true,
  );
  closeGame();
  const old = detailsCalls()[0];
  assert.ok(old.options.signal.aborted);
  old.reject(new Error('late offline response'));
  await nextTurn();
  assert.ok(!document.querySelector('.snackbar:not([hidden])'));
  await navigateHistory('back');
  assert.equal(url().searchParams.get('game'), 'alpha');
  assert.equal(detailsCalls().length, 2);
  await navigateHistory('forward');
  assert.ok(!url().searchParams.has('game'));
  assert.ok(detailsCalls()[1].options.signal.aborted);
});

test('rapid close and history reopen cancels stale closing animations for both dialog types', async (context) => {
  const { document, openGame, navigateHistory, window, finishExits } = await setup(context);
  await openGame('alpha');
  let dialog = document.querySelector('#game-details');
  dialog.style.animationDuration = '1s';
  document.querySelector('.game-details__close').click();
  await navigateHistory('back');
  assert.ok(dialog.open);
  assert.ok(!dialog.classList.contains('is-closing'));
  assert.equal(document.querySelector('.game-details__title').textContent, 'API alpha');
  document.querySelector('.header__login').click();
  dialog = document.querySelector('#auth-dialog');
  dialog.style.animationDuration = '1s';
  dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
  await navigateHistory('back');
  finishExits();
  assert.ok(dialog.open);
  assert.ok(!dialog.classList.contains('is-closing'));
});

test('switching dialog types keeps only one modal and Home remains paused', async (context) => {
  const { document, setUrl, pauses, finishExits, window } = await setup(
    context,
    '/Minigames/?auth=login',
  );
  assert.equal(pauses.mock.calls.at(-1).arguments[0], true);
  await setUrl('/Minigames/?game=alpha');
  assert.equal(document.querySelectorAll('dialog[open]').length, 1);
  assert.ok(document.querySelector('#game-details').open);
  assert.ok(!document.body.classList.contains('has-open-auth'));
  assert.equal(pauses.mock.calls.at(-1).arguments[0], true);
  await setUrl('/Minigames/?auth=register');
  assert.equal(document.querySelectorAll('dialog[open]').length, 1);
  assert.ok(!document.body.classList.contains('has-open-dialog'));
  document
    .querySelector('#auth-dialog')
    .dispatchEvent(new window.Event('cancel', { cancelable: true }));
  finishExits();
  assert.equal(pauses.mock.calls.at(-1).arguments[0], false);
});

test('page navigation aborts dialog loading and Back restores the previous base page and modal', async (context) => {
  const { document, detailsCalls, url, navigateHistory } = await setup(
    context,
    '/Minigames/library?category=puzzle&sort=name-asc&page=2&game=alpha',
    true,
  );
  document.querySelector('.header__logo').click();
  await nextTurn();
  assert.equal(url().pathname, '/Minigames/');
  assert.ok(detailsCalls()[0].options.signal.aborted);
  assert.ok(!document.querySelector('dialog[open]'));
  await navigateHistory('back');
  assert.equal(url().pathname, '/Minigames/library');
  assert.equal(url().searchParams.get('page'), '2');
  assert.ok(document.querySelector('#game-details').open);
  assert.equal(detailsCalls().length, 2);
});

test('destroy removes history reactions, body locks, and dialog listeners', async (context) => {
  const { app, document, window, calls } = await setup(context, '/Minigames/?auth=login');
  const dialog = document.querySelector('#auth-dialog');
  app.destroy();
  const count = calls.length;
  window.history.pushState({}, '', '/Minigames/library?game=alpha');
  window.dispatchEvent(new window.PopStateEvent('popstate'));
  dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
  await nextTurn();
  assert.equal(calls.length, count);
  assert.equal(document.querySelector('#app').childNodes.length, 0);
  assert.ok(!document.body.classList.contains('has-open-auth'));
  assert.ok(!document.body.classList.contains('has-open-dialog'));
});
