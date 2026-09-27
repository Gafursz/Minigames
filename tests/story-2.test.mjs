import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from './helpers.mjs';

function setup(context, hash) {
  const app = createApp(hash);
  context.after(() => {
    assert.deepEqual(app.errors, []);
    app.close();
  });
  return app;
}

const currentGame = (app) =>
  app.query('.slider__item[data-slot="0"] .game-card__title').textContent;

test('Library routes directly, reuses navigation, and opens six game cards', (context) => {
  const app = setup(context);
  assert.equal(app.query('h1').textContent.trim(), 'Game Library');
  assert.equal(app.all('.library-card').length, 6);
  assert.equal(app.query('.header__link[aria-current="page"]').textContent, 'Library');
  for (const button of app.all('.library-card__details')) {
    button.click();
    assert.equal(app.query('dialog').open, true);
    assert.equal(app.query('#game-details-title').textContent, 'Tukoni: Forest Keepers');
    app.click('.game-details__close');
    app.tick(0);
  }
});

test('SPA links and hash history replace pages and dispose carousel resources', async (context) => {
  const app = setup(context, '#/');
  assert.equal(app.all('.slider__item').length, 9);
  const oldTrack = app.query('.slider__track');
  await app.navigate(() => app.click('.header__link[href="#/library"]'));
  assert.equal(app.all('.library-card').length, 6);
  app.tick(12_000);
  assert.equal(oldTrack.isConnected, false);
  assert.equal(app.timers.size, 0);
  await app.navigate(() => {
    app.browser.location.hash = '#/';
  });
  assert.equal(app.all('.slider__item').length, 9);
  assert.equal(app.observers.size, 1);
});

test('category selection is exclusive and sort supports keyboard selection without changing cards', (context) => {
  const app = setup(context);
  const cards = app.query('.library__cards').textContent;
  const chips = app.all('.library-filters__chip');
  chips.at(-1).click();
  assert.equal(chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true').length, 1);
  app.click('.library-sort__trigger');
  const options = app.all('[role="option"]');
  options[1].dispatchEvent(new app.browser.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(app.browser.document.activeElement, options[3]);
  options[3].dispatchEvent(
    new app.browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
  assert.match(app.query('.library-sort__trigger').textContent, /Name Z→A/);
  assert.equal(app.query('[role="listbox"]').hidden, true);
  assert.equal(app.query('.library__cards').textContent, cards);
});

test('pagination shifts the mobile window, preserves focus, and keeps cards unchanged', (context) => {
  const app = setup(context);
  const cards = app.query('.library__cards').textContent;
  assert.equal(app.all('.pagination__button:not([data-direction])').length, 3);
  for (let index = 0; index < 3; index++) app.click('[data-direction="next"]');
  assert.equal(
    app.query('[aria-current="page"].pagination__button:not([data-direction])').textContent.trim(),
    '4',
  );
  assert.equal(app.query('[data-direction="next"]').disabled, true);
  assert.equal(app.query('[data-direction="previous"]').disabled, false);
  assert.equal(app.browser.document.activeElement.textContent.trim(), '4');
  assert.equal(app.query('.library__cards').textContent, cards);
  app.query('.pagination').style.setProperty('--page-buttons', '4');
  app.resize();
  assert.equal(app.all('.pagination__button:not([data-direction])').length, 4);
});

test('dialog toggles independent likes and favorites, keeps counts, and resets on reopening', (context) => {
  const app = setup(context);
  const trigger = app.query('.library-card__details');
  trigger.click();
  const likes = app.all('.game-comment__like');
  const counts = likes.map((like) => like.textContent);
  likes[0].click();
  likes[2].click();
  assert.deepEqual(
    likes.map((like) => like.getAttribute('aria-pressed')),
    ['true', 'false', 'true'],
  );
  assert.deepEqual(
    likes.map((like) => like.textContent),
    counts,
  );
  app.click('.game-details__favorite');
  assert.equal(app.query('.game-details__favorite').getAttribute('aria-pressed'), 'true');
  const input = app.query('#game-comment');
  input.value = 'An unsent draft';
  Object.defineProperty(input, 'scrollHeight', { value: 150 });
  input.dispatchEvent(new app.browser.Event('input'));
  assert.notEqual(input.style.height, '');
  const submit = new app.browser.Event('submit', { cancelable: true });
  app.query('form').dispatchEvent(submit);
  assert.equal(submit.defaultPrevented, true);
  assert.equal(app.all('.game-comment').length, 3);
  app.query('dialog').dispatchEvent(new app.browser.Event('cancel', { cancelable: true }));
  app.tick(0);
  assert.equal(app.query('dialog').open, false);
  assert.equal(app.browser.document.activeElement, trigger);
  trigger.click();
  assert.equal(input.value, '');
  assert.equal(input.style.height, '');
  assert.equal(app.all('[aria-pressed="true"]').length, 1); // Only the All Games chip.
});

test('only backdrop clicks close the dialog and navigation removes its scroll lock', async (context) => {
  const app = setup(context);
  app.click('.library-card__details');
  app.click('.game-details__description');
  assert.equal(app.query('dialog').open, true);
  app
    .query('dialog')
    .dispatchEvent(new app.browser.MouseEvent('click', { clientX: -10, clientY: -10 }));
  app.tick(0);
  assert.equal(app.query('dialog').open, false);
  app.click('.library-card__details');
  await app.navigate(() => {
    app.browser.location.hash = '#/';
  });
  assert.equal(app.browser.document.body.classList.contains('has-open-dialog'), false);
});

test('slider loops in both directions through exactly nine unique featured games', (context) => {
  const app = setup(context, '#/');
  const first = currentGame(app);
  const games = new Set();
  for (let index = 0; index < 9; index++) {
    games.add(currentGame(app));
    app.click('.slider__control--next');
  }
  assert.equal(games.size, 9);
  assert.equal(currentGame(app), first);
  for (let index = 0; index < 9; index++) app.click('.slider__control--previous');
  assert.equal(currentGame(app), first);
  assert.equal(app.all('.slider__item[aria-hidden="false"]').length, 5);
  app.query('.slider__track').style.setProperty('--visible-slides', '3');
  app.resize();
  assert.equal(app.all('.slider__item[aria-hidden="false"]').length, 3);
});

test('autoplay advances at four seconds and holding preserves the remaining countdown', (context) => {
  const app = setup(context, '#/');
  const first = currentGame(app);
  app.tick(1500);
  const track = app.query('.slider__track');
  app.pointer(track, 'pointerdown', 100);
  app.tick(8000);
  assert.equal(currentGame(app), first);
  app.pointer(app.browser, 'pointerup', 100);
  app.tick(2499);
  assert.equal(currentGame(app), first);
  app.tick(1);
  assert.notEqual(currentGame(app), first);
});

test('swiping resets autoplay and suppresses the accidental dialog click', (context) => {
  const app = setup(context, '#/');
  const track = app.query('.slider__track');
  const first = currentGame(app);
  app.tick(3000);
  app.pointer(track, 'pointerdown', 200);
  app.tick(6000);
  app.pointer(track, 'pointermove', 100);
  app.pointer(app.browser, 'pointerup', 100);
  assert.notEqual(currentGame(app), first);
  const afterSwipe = currentGame(app);
  app
    .query('.slider__item[data-slot="0"] button')
    .dispatchEvent(new app.browser.MouseEvent('click', { bubbles: true, detail: 1 }));
  assert.equal(app.query('dialog').open, false);
  app.tick(3999);
  assert.equal(currentGame(app), afterSwipe);
  app.tick(1);
  assert.notEqual(currentGame(app), afterSwipe);
});

test('dialog pause overlaps a pointer hold without restarting autoplay early', (context) => {
  const app = setup(context, '#/');
  const first = currentGame(app);
  app.tick(1000);
  app.pointer(app.query('.slider__track'), 'pointerdown', 100);
  app.click('.slider__item[data-slot="0"] button');
  app.pointer(app.browser, 'pointerup', 100);
  app.tick(9000);
  assert.equal(currentGame(app), first);
  app.click('.game-details__close');
  app.tick(0);
  app.tick(2999);
  assert.equal(currentGame(app), first);
  app.tick(1);
  assert.notEqual(currentGame(app), first);
});

test('page windows clamp at both ends and slide offsets wrap across every position', (context) => {
  const app = setup(context);
  const { getPageWindow, getSlideOffset, wrapIndex, escapeHtml } = app.browser.MiniGames;
  assert.deepEqual([...getPageWindow(1, 4, 3)], [1, 2, 3]);
  assert.deepEqual([...getPageWindow(4, 4, 3)], [2, 3, 4]);
  assert.deepEqual([...getPageWindow(4, 4, 4)], [1, 2, 3, 4]);
  assert.equal(wrapIndex(-1, 9), 8);
  assert.equal(wrapIndex(9, 9), 0);
  for (let active = 0; active < 9; active++) {
    const offsets = Array.from({ length: 9 }, (_, index) => getSlideOffset(index, active, 9));
    assert.deepEqual(
      offsets.toSorted((a, b) => a - b),
      [-4, -3, -2, -1, 0, 1, 2, 3, 4],
    );
  }
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});
