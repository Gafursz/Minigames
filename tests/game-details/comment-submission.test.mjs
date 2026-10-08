import { expect, test, vi } from 'vitest';
import { GameComments } from '../../src/components/game-comments';
import { submitGameComment } from '../../src/api/minigames-api';
import { snackbar } from '../../src/components/snackbar';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const profile = { displayName: 'alex99', email: 'alex+games@example.com' };
const comment = {
  commentId: 'c1',
  authorName: '  bob',
  text: '<img src=x onerror=alert(1)>',
  likesCount: 0,
  isLikedByCurrentUser: false,
  createdAt: '2026-10-08T10:00:00Z',
};
const list = (data = [comment], totalComments = 21) => ({
  data,
  meta: { totalComments, returnedCount: data.length, sort: 'newest' },
});
async function setup(context, isGuest = false) {
  const guard = vi.fn(() => (isGuest ? undefined : profile));
  const comments = new GameComments(guard);
  const window = createBrowserDom(context, `<dialog>${comments.render()}</dialog>`);
  const dialog = window.document.querySelector('dialog');
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => globalThis.Response.json(list()));
  comments.setAuthenticated(isGuest ? undefined : profile);
  comments.bindEvents(dialog, 'alpha');
  context.onTestFinished(() => {
    comments.destroy();
    snackbar.destroy();
  });
  await vi.waitFor(() => expect(dialog.querySelector('.game-comment')).not.toBeNull());
  fetch.mockClear();
  const field = dialog.querySelector('textarea');
  const button = dialog.querySelector('.game-comments__submit');
  const notices = vi.spyOn(snackbar, 'show');
  const send = () =>
    dialog
      .querySelector('form')
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  return { comments, window, dialog, fetch, field, button, guard, notices, send };
}

test('guest form is locked; forged submit still checks the session and sends no mutation', async (context) => {
  const { field, button, send, guard, fetch } = await setup(context, true);
  expect(field.disabled).toBe(true);
  expect(button.disabled).toBe(true);
  field.value = 'hello';
  send();
  expect(guard).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
});

test('POST locks input, trims text, blocks duplicates, then refreshes personalized latest comments and full count', async (context) => {
  const { field, button, fetch, send, dialog } = await setup(context);
  expect(dialog.querySelector('.game-comments__avatar').textContent).toBe('A');
  const pending = Promise.withResolvers();
  fetch
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(globalThis.Response.json(list([comment], 123)));
  field.value = '  My comment  ';
  field.style.height = '120px';
  send();
  send();
  expect(fetch).toHaveBeenCalledOnce();
  expect(field.disabled).toBe(true);
  expect(button.disabled).toBe(true);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    userEmail: profile.email,
    authorName: profile.displayName,
    text: 'My comment',
  });
  expect(fetch.mock.calls[0][0].pathname).toBe('/api/games/alpha/comments');
  pending.resolve(globalThis.Response.json({ data: comment }, { status: 201 }));
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(field.value).toBe('');
  expect(field.style.height).toBe('');
  const [url, options] = fetch.mock.calls[1];
  expect(options.method).toBe('GET');
  expect(url.searchParams.get('userEmail')).toBe(profile.email);
  expect(url.searchParams.get('limit')).toBe('3');
  expect(url.searchParams.get('sort')).toBe('newest');
  expect(dialog.querySelector('.game-comments__title').textContent).toBe('Comments (123)');
  expect(dialog.querySelector('.game-comment__text').textContent).toBe(comment.text);
  expect(dialog.querySelector(':scope .game-comment__text img')).toBeNull();
});

for (const text of ['', ' '.repeat(3), 'x'.repeat(501)]) {
  test(`rejects invalid text length ${text.length} without a POST`, async (context) => {
    const { field, send, fetch, window } = await setup(context);
    field.value = text;
    send();
    expect(fetch).not.toHaveBeenCalled();
    expect(field.getAttribute('aria-invalid')).toBe('true');
    field.value = 'fixed';
    field.dispatchEvent(new window.Event('input'));
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });
}

for (const text of ['x', 'x'.repeat(500)]) {
  test(`accepts trimmed boundary length ${text.length}`, async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(globalThis.Response.json({ data: comment }, { status: 201 }));
    await submitGameComment('alpha', profile.email, profile.displayName, ` ${text} `);
    expect(JSON.parse(fetch.mock.calls[0][1].body).text).toBe(text);
  });
}

test('Enter submits; Shift+Enter and composing Enter do not submit', async (context) => {
  const { field, window, fetch, button } = await setup(context);
  field.value = 'hello';
  fetch.mockResolvedValueOnce(globalThis.Response.json({ data: comment }, { status: 201 }));
  field.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true }),
  );
  field.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, cancelable: true }),
  );
  expect(fetch).not.toHaveBeenCalled();
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
  field.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(true);
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

for (const status of [400, 503, 408, 200]) {
  test(`HTTP ${status} retains draft and unlocks without replay`, async (context) => {
    const { field, send, fetch, button, notices } = await setup(context);
    fetch.mockResolvedValueOnce(globalThis.Response.json({ error: 'No' }, { status }));
    field.value = 'keep this';
    send();
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    expect(field.value).toBe('keep this');
    expect(fetch).toHaveBeenCalledOnce();
    expect(notices.mock.calls.at(-1)[0]).toContain(status === 400 ? 'rejected' : 'unknown');
  });
}

test('network failure keeps draft, reports unknown outcome, and does not retry', async (context) => {
  const { field, send, fetch, button, notices } = await setup(context);
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  field.value = 'keep';
  send();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(field.value).toBe('keep');
  expect(fetch).toHaveBeenCalledOnce();
  expect(notices.mock.calls.at(-1)[0]).toContain('unknown');
});

test('successful creation with failed refresh keeps input cleared and offers GET retry', async (context) => {
  const { field, send, fetch, button, dialog } = await setup(context);
  fetch
    .mockResolvedValueOnce(globalThis.Response.json({ data: comment }, { status: 201 }))
    .mockRejectedValueOnce(new TypeError('offline'));
  field.value = 'posted';
  send();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(field.value).toBe('');
  expect(dialog.querySelector('.content-feedback--error')).not.toBeNull();
  const retry = dialog.querySelector(':scope .game-comments__content button');
  retry.click();
  await vi.waitFor(() => expect(dialog.querySelector('.game-comment')).not.toBeNull());
  expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual(['POST', 'GET', 'GET']);
});

test('avatar chooses one token color per name, stays stable after refresh, and trims uppercase initial', async (context) => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  const { dialog, fetch, field, send, button } = await setup(context);
  expect(dialog.querySelector('.game-comment__avatar').textContent).toBe('B');
  const original = dialog.querySelector('.game-comment__avatar').className;
  expect(original).toContain('--2');
  random.mockReturnValue(0.9);
  fetch.mockResolvedValueOnce(globalThis.Response.json({ data: comment }, { status: 201 }));
  field.value = 'more';
  send();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(dialog.querySelector('.game-comment__avatar').className).toBe(original);
});

test('input grows with scroll height, resets on actual reopen, and logout retains draft but locks form', async (context) => {
  const { field, window, comments, dialog } = await setup(context);
  Object.defineProperty(field, 'scrollHeight', { value: 200, configurable: true });
  field.value = 'draft';
  field.dispatchEvent(new window.Event('input'));
  expect(Number.parseInt(field.style.height)).toBeGreaterThanOrEqual(200);
  comments.setAuthenticated(undefined);
  expect(field.disabled).toBe(true);
  expect(field.value).toBe('draft');
  comments.bindEvents(dialog, 'beta');
  expect(field.value).toBe('');
  expect(field.style.height).toBe('');
});

for (const action of ['logout', 'destroy']) {
  test(`${action} ignores late POST success and never clears the preserved draft`, async (context) => {
    const { field, send, fetch, comments, notices } = await setup(context);
    const pending = Promise.withResolvers();
    fetch.mockReturnValueOnce(pending.promise);
    field.value = 'preserve';
    send();
    const signal = fetch.mock.calls[0][1].signal;
    if (action === 'logout') comments.setAuthenticated(undefined);
    else comments.destroy();
    expect(signal.aborted).toBe(true);
    pending.resolve(globalThis.Response.json({ data: comment }, { status: 201 }));
    await pending.promise;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(field.value).toBe('preserve');
    expect(notices).not.toHaveBeenCalledWith('Comment posted successfully.', 'success');
    expect(fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
  });
}

test('API validates profile and text before sending', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  for (const values of [
    ['', 'Alex', 'ok'],
    [profile.email, 'A', 'ok'],
    [profile.email, 'A'.repeat(31), 'ok'],
    [profile.email, 'Alex', ' '],
    [profile.email, 'Alex', 'x'.repeat(501)],
  ]) {
    await expect(submitGameComment('alpha', ...values)).rejects.toThrow();
  }
  expect(fetch).not.toHaveBeenCalled();
});
