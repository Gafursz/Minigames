import { expect, test, vi } from 'vitest';
import { GameComments } from '../../src/components/game-comments';
import { toggleCommentLike } from '../../src/api/minigames-api';
import { snackbar } from '../../src/components/snackbar';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const profile = { displayName: 'Alex', email: 'alex+games@example.com' };
const first = {
  commentId: '123e4567-e89b-12d3-a456-426614174000',
  authorName: 'Bob',
  text: 'Hello',
  likesCount: 4,
  isLikedByCurrentUser: true,
  createdAt: '2026-10-09T07:00:00Z',
};
const second = {
  ...first,
  commentId: '123e4567-e89b-12d3-a456-426614174001',
  likesCount: 2,
  isLikedByCurrentUser: false,
};
const listing = (data = [first, second]) => ({
  data,
  meta: { totalComments: 24, returnedCount: data.length, sort: 'newest' },
});
const reply = (liked, count) =>
  globalThis.Response.json({ data: { isLikedByCurrentUser: liked, likesCount: count } });
async function setup(context, isGuest = false) {
  const guard = vi.fn(() => (isGuest ? undefined : profile));
  const comments = new GameComments(guard);
  const window = createBrowserDom(context, `<dialog>${comments.render()}</dialog>`);
  const dialog = window.document.querySelector('dialog');
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => globalThis.Response.json(listing()));
  comments.setAuthenticated(isGuest ? undefined : profile);
  comments.bindEvents(dialog, 'alpha');
  context.onTestFinished(() => {
    comments.destroy();
    snackbar.destroy();
  });
  await vi.waitFor(() => expect(dialog.querySelectorAll('.game-comment__like')).toHaveLength(2));
  const initial = fetch.mock.calls[0];
  fetch.mockClear();
  return {
    comments,
    window,
    dialog,
    fetch,
    guard,
    initial,
    buttons: [...dialog.querySelectorAll('.game-comment__like')],
    notices: vi.spyOn(snackbar, 'show'),
  };
}

test('API sends selected comment ID and active email, returning server values', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(false, 3));
  await expect(toggleCommentLike(first.commentId, profile.email)).resolves.toEqual({
    isLikedByCurrentUser: false,
    likesCount: 3,
  });
  const [url, options] = fetch.mock.calls[0];
  expect(url.pathname).toBe(`/api/comments/${first.commentId}/like`);
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({ userEmail: profile.email });
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(options.headers.Authorization).toBeUndefined();
});

for (const data of [
  undefined,
  {},
  { isLikedByCurrentUser: 'true', likesCount: 4 },
  { isLikedByCurrentUser: true, likesCount: -1 },
  { isLikedByCurrentUser: false, likesCount: 1.5 },
]) {
  test(`invalid like response ${JSON.stringify(data)} is rejected`, async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      globalThis.Response.json(data === undefined ? {} : { data }),
    );
    await expect(toggleCommentLike(first.commentId, profile.email)).rejects.toThrow(
      'invalid comment like data',
    );
  });
}

test('invalid ID/email and unexpected success status cannot produce a confirmed toggle', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      globalThis.Response.json(
        { data: { isLikedByCurrentUser: true, likesCount: 5 } },
        { status: 201 },
      ),
    );
  await expect(toggleCommentLike('../x', profile.email)).rejects.toThrow();
  await expect(toggleCommentLike(first.commentId, ' ')).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  await expect(toggleCommentLike(first.commentId, profile.email)).rejects.toThrow(
    'unexpected success status',
  );
});

for (const isGuest of [false, true]) {
  test(`initial state uses ${isGuest ? 'guest' : 'personalized'} GET`, async (context) => {
    const { initial, buttons } = await setup(context, isGuest);
    expect(initial[0].searchParams.get('userEmail') ?? undefined).toBe(
      isGuest ? undefined : profile.email,
    );
    expect(initial[0].searchParams.get('limit')).toBe('3');
    expect(buttons[0].getAttribute('aria-pressed')).toBe(String(!isGuest));
    expect(buttons[0].querySelector('span').textContent).toBe('4');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });
}

test('guest click invokes auth guard, warns, and leaves counts unchanged without POST', async (context) => {
  const { buttons, fetch, guard, notices } = await setup(context, true);
  buttons[0].click();
  expect(guard).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
  expect(buttons[0].querySelector('span').textContent).toBe('4');
  expect(notices).toHaveBeenCalledWith('Please sign in to like comments.', 'error');
});

test('pending lock is per comment, duplicate clicks are blocked, and unlike/like use exact server counts', async (context) => {
  const { buttons, fetch, notices } = await setup(context);
  const pending = Promise.withResolvers();
  fetch
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(reply(true, 9))
    .mockResolvedValueOnce(reply(true, 8));
  const initialIcon = buttons[0].querySelector('img').src;
  buttons[0].click();
  buttons[0].click();
  expect(fetch).toHaveBeenCalledOnce();
  expect(buttons[0].disabled).toBe(true);
  expect(buttons[0].getAttribute('aria-busy')).toBe('true');
  expect(buttons[0].querySelector('span').textContent).toBe('…');
  expect(buttons[1].disabled).toBe(false);
  buttons[1].click();
  await vi.waitFor(() => expect(buttons[1].disabled).toBe(false));
  expect(buttons[1].querySelector('span').textContent).toBe('9');
  pending.resolve(reply(false, 3));
  await vi.waitFor(() => expect(buttons[0].disabled).toBe(false));
  expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  expect(buttons[0].querySelector('span').textContent).toBe('3');
  expect(buttons[0].querySelector('img').src).not.toBe(initialIcon);
  expect(notices).toHaveBeenCalledWith('Comment like removed.', 'success');
  buttons[0].click();
  await vi.waitFor(() => expect(buttons[0].disabled).toBe(false));
  expect(buttons[0].querySelector('span').textContent).toBe('8');
  expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
});

for (const failure of ['network', 'http', 'invalid']) {
  test(`${failure} failure restores confirmed state and explicit retry sends GET only`, async (context) => {
    const { buttons, fetch, dialog } = await setup(context);
    if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('offline'));
    else if (failure === 'http')
      fetch.mockResolvedValueOnce(
        globalThis.Response.json({ error: 'unavailable' }, { status: 503 }),
      );
    else fetch.mockResolvedValueOnce(globalThis.Response.json({ data: {} }));
    buttons[0].click();
    await vi.waitFor(() => expect(buttons[0].disabled).toBe(false));
    expect(fetch).toHaveBeenCalledOnce();
    expect(buttons[0].querySelector('span').textContent).toBe('4');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].title).toContain('Retry');
    fetch.mockResolvedValueOnce(
      globalThis.Response.json(listing([{ ...first, isLikedByCurrentUser: false, likesCount: 3 }])),
    );
    buttons[0].click();
    await vi.waitFor(() => expect(dialog.querySelectorAll('.game-comment__like')).toHaveLength(1));
    expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual(['POST', 'GET']);
    expect(dialog.querySelector('.game-comment__like').getAttribute('aria-pressed')).toBe('false');
  });
}

for (const action of ['logout', 'destroy', 'user-change']) {
  test(`${action} cancels pending like and ignores late response`, async (context) => {
    const { comments, buttons, fetch, notices, dialog } = await setup(context);
    const pending = Promise.withResolvers();
    fetch.mockReturnValueOnce(pending.promise);
    buttons[0].click();
    const signal = fetch.mock.calls[0][1].signal;
    if (action === 'destroy') comments.destroy();
    else
      comments.setAuthenticated(
        action === 'logout' ? undefined : { displayName: 'Bea', email: 'bea@example.com' },
      );
    expect(signal.aborted).toBe(true);
    pending.resolve(reply(true, 999));
    await pending.promise;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(notices).not.toHaveBeenCalledWith('Comment liked.', 'success');
    expect(dialog.textContent).not.toContain('999');
    if (action === 'user-change')
      expect(fetch.mock.calls[1][0].searchParams.get('userEmail')).toBe('bea@example.com');
  });
}

test('expiration discovered at click sends no POST and resets guest UI', async (context) => {
  const { comments, buttons, fetch, guard } = await setup(context);
  guard.mockImplementation(() => {
    comments.setAuthenticated(undefined);
    return;
  });
  buttons[0].click();
  expect(fetch.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
  await vi.waitFor(() => expect(buttons[0].isConnected).toBe(false));
});
