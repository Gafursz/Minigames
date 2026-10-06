import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { URL } from 'node:url';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const NOW = Date.parse('2026-10-04T12:00:00Z');
const detailsData = (slug = 'alpha', overrides = {}) => ({
  data: {
    slug,
    name: `API ${slug}`,
    heroImage: '/assets/images/games/cat-mail-co-hero.jpg',
    rating: 4.7,
    likesCount: 1234,
    isLikedByCurrentUser: false,
    fullDescription: 'API description',
    specs: { genre: 'Puzzle', players: 'Solo', duration: '20 minutes', price: '$2.00' },
    topRecords: [
      {
        position: 1,
        playerName: 'API Champion',
        score: 10_000,
        achievedAt: '2026-10-03T12:00:00Z',
      },
    ],
    ...overrides,
  },
});
const comment = (id, changes = {}) => ({
  commentId: `comment-${id}`,
  authorName: `Player ${id}`,
  text: `API comment ${id}`,
  likesCount: 12,
  isLikedByCurrentUser: false,
  createdAt: '2026-10-04T11:00:00Z',
  ...changes,
});
const commentsData = (data = [comment(1), comment(2), comment(3)], totalComments = 12) => ({
  data,
  meta: { totalComments, returnedCount: data.length, sort: 'newest' },
});
async function setup(context) {
  const modules = await import('./entry.ts');
  let details;

  const window = createBrowserDom(
    context,
    '<main>Base page</main><button id="trigger">Details</button><div id="mount"></div>',
  );
  context.onTestFinished(() => {
    details?.destroy();
    modules.snackbar.destroy();
  });
  const { document } = window;
  const changes = [];
  details = new modules.GameDetails((isOpen) => {
    changes.push(isOpen);
  });
  document.querySelector('#mount').innerHTML = details.render();
  details.bindEvents();
  vi.spyOn(Date, 'now').mockImplementation(() => NOW);
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (target, options) =>
      new Promise((resolve, reject) => {
        calls.push({ url: new URL(target), options, resolve, reject });
      }),
  );
  const complete = async (index, body, status = 200) => {
    calls[index].resolve(globalThis.Response.json(body, { status }));
    await nextTurn();
  };
  const trigger = document.querySelector('#trigger');
  const dialog = document.querySelector('#game-details');
  const content = dialog.querySelector('.game-details__content');
  const open = (slug = 'alpha') => details.open(slug, trigger);
  const ready = async () => {
    open();
    await complete(0, detailsData());
    await complete(1, commentsData());
  };
  return {
    ...modules,
    details,
    window,
    document,
    calls,
    complete,
    trigger,
    dialog,
    content,
    open,
    ready,
    changes,
  };
}

test('opens the selected game, renders API fields, and requests three latest comments with the full count', async (context) => {
  const { open, calls, complete, dialog, content, document, getApiGameHeroImage } =
    await setup(context);
  open();
  assert.ok(dialog.open);
  assert.equal(content.dataset.feedbackState, 'loading');
  assert.ok(dialog.querySelector('.game-details__close'));
  assert.equal(calls[0].url.pathname, '/api/games/alpha');
  assert.equal(calls[0].url.search, '');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.method, 'GET');
  await complete(0, detailsData());
  assert.equal(dialog.querySelector('.game-details__title').textContent, 'API alpha');
  assert.equal(dialog.querySelector('#game-details-title').textContent, 'API alpha');
  assert.equal(dialog.querySelector('.game-details__description').textContent, 'API description');
  assert.equal(
    dialog.querySelector('.game-details__cover').getAttribute('src'),
    getApiGameHeroImage(detailsData().data.heroImage),
  );
  assert.deepEqual(
    [...dialog.querySelectorAll('dd')].map((node) => node.textContent),
    ['Puzzle', 'Solo', '20 minutes', '$2.00'],
  );
  assert.match(dialog.querySelector('.game-stats').textContent, /4\.7/);
  assert.match(dialog.querySelector('.game-records').textContent, /API Champion/);
  assert.match(dialog.querySelector('.game-records').textContent, /10,000 pts/);
  assert.match(dialog.querySelector('.game-records').textContent, /1 day ago/);
  assert.equal(calls[1].url.pathname, '/api/games/alpha/comments');
  assert.deepEqual(Object.fromEntries(calls[1].url.searchParams), { limit: '3', sort: 'newest' });
  assert.equal(
    dialog.querySelectorAll(':scope .feedback-skeleton--comments .feedback-skeleton__item').length,
    3,
  );
  await complete(1, commentsData());
  assert.equal(dialog.querySelector('.game-comments__title').textContent, 'Comments (12)');
  assert.equal(dialog.querySelectorAll('.game-comment').length, 3);
  assert.equal(dialog.querySelector('.game-comment__date').textContent, '1 hour ago');
  assert.equal(
    dialog.querySelector('.game-comment__date').getAttribute('datetime'),
    '2026-10-04T11:00:00Z',
  );
  assert.equal(dialog.querySelector(':scope .game-comment__like span').textContent, '12');
  assert.equal(document.querySelector('main').textContent, 'Base page');
});

test('all API text remains literal and unsafe media uses a placeholder', async (context) => {
  const { open, complete, dialog } = await setup(context);
  const literal = '<img src=x onerror="alert(1)">';
  open();
  await complete(
    0,
    detailsData('alpha', {
      name: literal,
      fullDescription: literal,
      heroImage: 'javascript:alert(1)',
      specs: {
        genre: literal,
        players: literal,
        duration: literal,
        price: literal,
        [literal]: literal,
      },
      topRecords: [
        { position: 4, playerName: literal, score: 4, achievedAt: '2026-10-03T12:00:00Z' },
      ],
    }),
  );
  await complete(1, commentsData([comment(1, { authorName: literal, text: literal })], 1));
  assert.equal(dialog.querySelector('.game-details__title').textContent, literal);
  assert.equal(dialog.querySelector('.game-comment__text').textContent, literal);
  assert.equal(dialog.querySelector('.game-comment__name').textContent, literal);
  assert.equal(dialog.querySelectorAll('dd').length, 4);
  assert.ok(dialog.querySelector('.game-details__cover--placeholder'));
  assert.ok(!dialog.querySelector('img[onerror], script'));
  assert.match(dialog.querySelector('.game-records').textContent, /#4/);
});

test('details failure has a persistent Retry and duplicate clicks issue only one retry', async (context) => {
  const { open, complete, content, calls, document } = await setup(context);
  open();
  await complete(0, { error: 'Try later' }, 503);
  assert.equal(content.dataset.feedbackState, 'error');
  assert.match(content.textContent, /Try later/);
  assert.ok(document.querySelector('.snackbar--error'));
  const retry = content.querySelector('.content-feedback__retry');
  retry.click();
  retry.click();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.href, calls[1].url.href);
  await complete(1, detailsData());
  assert.ok(document.querySelector('.snackbar--success'));
  await complete(2, commentsData());
});

test('unknown games and empty game data show Game Not Found inside the open modal', async (context) => {
  const { open, complete, content, calls, details, dialog, document } = await setup(context);
  open('missing');
  await complete(0, { error: 'Game not found' }, 404);
  assert.ok(dialog.open);
  assert.match(content.textContent, /Game Not Found/);
  assert.ok(!content.querySelector('.content-feedback__retry'));
  assert.equal(calls.length, 1);
  details.close(false);
  open('empty');
  await complete(1, { data: JSON.parse('null') });
  assert.match(content.textContent, /Game Not Found/);
  assert.equal(calls.length, 2);
  assert.equal(document.querySelector('main').textContent, 'Base page');
});

test('invalid slug syntax is a safe not-found state without a malformed API request', async (context) => {
  const { open, content, calls, dialog } = await setup(context);
  open('../<script>');
  assert.ok(dialog.open);
  assert.match(content.textContent, /Game Not Found/);
  assert.equal(calls.length, 0);
  assert.ok(!content.querySelector('script'));
});

test('malformed details and mismatched slugs are retryable without partially rendering data', async (context) => {
  const { open, complete, details, content, calls } = await setup(context);
  for (const payload of [
    {},
    detailsData('wrong'),
    detailsData('alpha', { rating: '4' }),
    detailsData('alpha', { specs: {} }),
    detailsData('alpha', {
      topRecords: [{ position: 1, playerName: 'Bad', score: 1, achievedAt: 'wrong date' }],
    }),
  ]) {
    open();
    await complete(calls.length - 1, payload);
    assert.equal(content.dataset.feedbackState, 'error');
    assert.ok(!content.querySelector('.game-details__heading'));
    details.close(false);
  }
});

test('comments failure and isolated retries keep game details visible', async (context) => {
  const { open, complete, calls, dialog, document } = await setup(context);
  open();
  await complete(0, detailsData());
  calls[1].reject(new TypeError('offline'));
  await nextTurn();
  const region = dialog.querySelector('.game-comments__content');
  assert.equal(region.dataset.feedbackState, 'error');
  assert.equal(dialog.querySelector('.game-details__title').textContent, 'API alpha');
  const retry = region.querySelector('.content-feedback__retry');
  retry.click();
  retry.click();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url.href, calls[1].url.href);
  await complete(2, { error: 'Unavailable' }, 500);
  region.querySelector('.content-feedback__retry').click();
  await complete(3, commentsData([], 0));
  assert.equal(region.dataset.feedbackState, 'empty');
  assert.equal(dialog.querySelector('.game-comments__title').textContent, 'Comments (0)');
  assert.ok(document.querySelector('.snackbar--success'));
});

test('empty records/comments and guest controls never perform authenticated mutations', async (context) => {
  const { open, complete, dialog, calls, window } = await setup(context);
  open();
  await complete(0, detailsData('alpha', { topRecords: [] }));
  await complete(1, commentsData([], 0));
  assert.match(dialog.querySelector('.game-records').textContent, /No records yet/);
  assert.match(dialog.querySelector('.game-comments__content').textContent, /No comments yet/);
  assert.ok(dialog.querySelector('.game-details__favorite').disabled);
  assert.ok(dialog.querySelector('.game-comments__submit').disabled);
  const form = dialog.querySelector('form');
  const submitted = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitted);
  assert.ok(submitted.defaultPrevented);
  const textarea = dialog.querySelector('textarea');
  Object.defineProperty(textarea, 'scrollHeight', { value: 120 });
  textarea.value = 'A draft';
  textarea.dispatchEvent(new window.Event('input'));
  assert.equal(textarea.style.height, '120px');
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.method === 'GET'));
});

test('malformed comment timestamps, likes, or totals are retryable errors', async (context) => {
  const { open, complete, calls, dialog } = await setup(context);
  open();
  await complete(0, detailsData());
  const payloads = [
    commentsData([comment(1, { createdAt: 'invalid' })]),
    commentsData([comment(1, { likesCount: '12' })]),
    commentsData([comment(1)], 0),
  ];
  for (const [index, payload] of payloads.entries()) {
    await complete(index + 1, payload);
    const root = dialog.querySelector('.game-comments__content');
    assert.equal(root.dataset.feedbackState, 'error');
    assert.ok(!root.querySelector('.game-comment'));
    root.querySelector('.content-feedback__retry').click();
  }
  await complete(calls.length - 1, commentsData());
  assert.equal(dialog.querySelectorAll('.game-comment').length, 3);
  assert.ok([...dialog.querySelectorAll('.game-comment__like')].every((button) => button.disabled));
});

test('opening a different game aborts and ignores an older details response', async (context) => {
  const { open, calls, complete, dialog } = await setup(context);
  open('alpha');
  open('beta');
  assert.ok(calls[0].options.signal.aborted);
  await complete(1, detailsData('beta'));
  await complete(0, detailsData('alpha'));
  assert.equal(dialog.querySelector('.game-details__title').textContent, 'API beta');
  assert.equal(calls[2].url.pathname, '/api/games/beta/comments');
  assert.equal(calls.length, 3);
  await complete(2, commentsData());
});

test('opening a different game cancels old comments and ignores their late failure', async (context) => {
  const { open, calls, complete, dialog, document } = await setup(context);
  open('alpha');
  await complete(0, detailsData());
  open('beta');
  assert.ok(calls[1].options.signal.aborted);
  await complete(2, detailsData('beta'));
  await complete(3, commentsData([comment(9)], 99));
  calls[1].reject(new Error('Late failure'));
  await nextTurn();
  assert.equal(dialog.querySelector('.game-comments__title').textContent, 'Comments (99)');
  assert.ok(!document.querySelector('.snackbar'));
});

test('closing cancels pending work, restores focus, and suppresses late updates', async (context) => {
  const { open, calls, complete, details, trigger, document, dialog } = await setup(context);
  trigger.focus();
  open();
  details.close(false);
  assert.ok(calls[0].options.signal.aborted);
  assert.ok(!dialog.open);
  assert.equal(document.activeElement, trigger);
  assert.ok(!document.body.classList.contains('has-open-dialog'));
  await complete(0, detailsData());
  assert.equal(calls.length, 1);
  assert.ok(!dialog.querySelector('.game-details__heading'));
});

test('reopening during the close animation cancels the old close and loads current data', async (context) => {
  const { ready, details, open, dialog, window, calls, complete, trigger, document } =
    await setup(context);
  await ready();
  dialog.style.animationDuration = '1s';
  details.close();
  assert.ok(dialog.classList.contains('is-closing'));
  open();
  assert.ok(!dialog.classList.contains('is-closing'));
  const oldEnd = new window.Event('animationend');
  Object.defineProperty(oldEnd, 'animationName', { value: 'game-details-exit' });
  dialog.dispatchEvent(oldEnd);
  assert.ok(dialog.open);
  await complete(2, detailsData());
  await complete(3, commentsData());
  assert.equal(calls.length, 4);
  details.close();
  dialog.dispatchEvent(oldEnd);
  assert.ok(!dialog.open);
  assert.equal(document.activeElement, trigger);
});

test('relative-time formatting covers every required boundary and safe fallbacks', async (context) => {
  const { formatRelativeTime } = await setup(context);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  for (const [elapsed, expected] of [
    [0, 'just now'],
    [minute - 1, 'just now'],
    [minute, '1 min ago'],
    [59 * minute, '59 min ago'],
    [hour, '1 hour ago'],
    [23 * hour, '23 hours ago'],
    [day, '1 day ago'],
    [6 * day, '6 days ago'],
    [7 * day, '1 week ago'],
    [21 * day, '3 weeks ago'],
    [28 * day, '1 month ago'],
    [60 * day, '2 months ago'],
    [364 * day, '11 months ago'],
    [365 * day, '1 year ago'],
    [730 * day, '2 years ago'],
    [-day, 'just now'],
  ])
    assert.equal(formatRelativeTime(new Date(NOW - elapsed).toISOString(), NOW), expected);
  assert.equal(formatRelativeTime('invalid', NOW), 'Unknown time');
});
