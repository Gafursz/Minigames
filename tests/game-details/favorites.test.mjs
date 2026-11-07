import { expect, test, vi } from 'vitest';
import { URL } from 'node:url';
import { FavoriteControl } from '../../src/features/game-details/favorite-control';
import { GameInfo } from '../../src/components/game-info';
import { getGameDetails, toggleFavorite } from '../../src/api/minigames-api';
import { snackbar } from '../../src/components/snackbar';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

const profile = { displayName: 'Alex', email: 'alex+games@example.com' };
const game = {
  slug: 'alpha',
  name: 'Alpha',
  heroImage: '',
  rating: 4,
  likesCount: 8,
  isLikedByCurrentUser: true,
  fullDescription: 'A game',
  specs: { genre: 'Puzzle', players: 'Solo', duration: '5 min', price: 'Free' },
  topRecords: [],
};
function setup(context, session = profile) {
  const window = createBrowserDom(context, `<dialog>${new GameInfo().render(game, true)}</dialog>`);
  const dialog = window.document.querySelector('dialog');
  const guard = vi.fn(() => session);
  const favorite = new FavoriteControl(guard);
  favorite.setProfile(session);
  favorite.bind(dialog, 'alpha', { isFavorited: true, likesCount: 8 }, session?.email);
  context.onTestFinished(() => {
    favorite.destroy();
    snackbar.destroy();
  });
  const notices = vi.spyOn(snackbar, 'show');
  const button = dialog.querySelector('button.game-details__favorite');
  return { window, dialog, guard, favorite, button, notices };
}

test('personalized details URL encodes the active email and uses GET', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(globalThis.Response.json({ data: game }));
  await getGameDetails('alpha', undefined, profile.email);
  const [url, options] = fetch.mock.calls[0];
  expect(new URL(url).searchParams.get('userEmail')).toBe(profile.email);
  expect(String(url)).toContain('%2B');
  expect(options.method).toBe('GET');
});

test('toggle sends the exact JSON contract and returns server state', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(globalThis.Response.json({ data: { isFavorited: false, likesCount: 7 } }));
  await expect(toggleFavorite('alpha', profile.email)).resolves.toEqual({
    isFavorited: false,
    likesCount: 7,
  });
  const [url, options] = fetch.mock.calls[0];
  expect(url.pathname).toBe('/api/games/alpha/favorite');
  expect(options.method).toBe('POST');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ userEmail: profile.email });
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBeUndefined();
});

for (const data of [
  undefined,
  {},
  { isFavorited: 'true', likesCount: 2 },
  { isFavorited: true, likesCount: -1 },
  { isFavorited: true, likesCount: 1.5 },
]) {
  test(`rejects malformed favorite response ${JSON.stringify(data)}`, async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      globalThis.Response.json(data === undefined ? {} : { data }),
    );
    await expect(toggleFavorite('alpha', profile.email)).rejects.toThrow('invalid favorite data');
  });
}

test('invalid identity and slug make no request', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  await expect(toggleFavorite('alpha', ' ')).rejects.toThrow('email');
  await expect(toggleFavorite('../invalid', profile.email)).rejects.toThrow('slug');
  expect(fetch).not.toHaveBeenCalled();
});

test('initial server state, pending lock, duplicate prevention, and confirmed remove/add', async (context) => {
  const { button, dialog, notices } = setup(context);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.textContent).toContain('Remove from Favorites');
  const pending = Promise.withResolvers();
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(
      globalThis.Response.json({ data: { isFavorited: true, likesCount: 12 } }),
    );
  button.click();
  button.click();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  pending.resolve(globalThis.Response.json({ data: { isFavorited: false, likesCount: 7 } }));
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(dialog.querySelector('[data-game-likes-count]').textContent).toBe('7');
  expect(notices).toHaveBeenCalledWith('Removed from Favorites.', 'success');
  button.click();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(dialog.querySelector('[data-game-likes-count]').textContent).toBe('12');
});

test('guest and expired-session guard send no POST and show a warning', (context) => {
  const { button, guard, favorite, notices } = setup(context);
  guard.mockImplementation(() => {
    favorite.setProfile(undefined);
    return;
  });
  const fetch = vi.spyOn(globalThis, 'fetch');
  button.click();
  expect(guard).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(notices).toHaveBeenCalledWith('Please sign in to use Favorites.', 'error');
});

test('ambiguous failure retains confirmed UI; explicit retry only reconciles with GET', async (context) => {
  const { button, dialog } = setup(context);
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(
      globalThis.Response.json({ data: { ...game, isLikedByCurrentUser: false, likesCount: 7 } }),
    );
  button.click();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.textContent).toContain('Retry favorite status');
  button.click();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual(['POST', 'GET']);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(dialog.querySelector('[data-game-likes-count]').textContent).toBe('7');
});

test('session recovery fetches status without replacing the draft or automatically toggling', async (context) => {
  const { favorite, button, dialog } = setup(context);
  // Explicitly establish guest state (the helper default is authenticated).
  favorite.setProfile(undefined);
  const draft = dialog.ownerDocument.createElement('textarea');
  draft.value = 'Keep my draft';
  dialog.append(draft);
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(globalThis.Response.json({ data: game }));
  favorite.setProfile(profile);
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0][1].method).toBe('GET');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(draft.value).toBe('Keep my draft');
  expect(draft.isConnected).toBe(true);
});

for (const action of ['logout', 'destroy']) {
  test(`${action} aborts an in-flight mutation and ignores its late result`, async (context) => {
    const { favorite, button, notices } = setup(context);
    const pending = Promise.withResolvers();
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(pending.promise);
    button.click();
    const signal = fetch.mock.calls[0][1].signal;
    if (action === 'logout') favorite.setProfile(undefined);
    else favorite.destroy();
    expect(signal.aborted).toBe(true);
    pending.resolve(globalThis.Response.json({ data: { isFavorited: true, likesCount: 100 } }));
    await pending.promise;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    expect(notices).not.toHaveBeenCalledWith('Added to Favorites.', 'success');
    if (action === 'logout') expect(button.getAttribute('aria-pressed')).toBe('false');
  });
}

test('failed personalized refresh can be retried without sending a toggle', async (context) => {
  const { favorite, button, notices } = setup(context);
  favorite.setProfile(undefined);
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(globalThis.Response.json({ error: 'Unavailable' }, { status: 503 }))
    .mockResolvedValueOnce(globalThis.Response.json({ data: game }));
  favorite.setProfile(profile);
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(button.textContent).toContain('Retry favorite status');
  expect(notices).toHaveBeenCalledWith(
    'Favorite status could not be loaded. Use Retry favorite status.',
    'error',
  );
  button.click();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'GET']);
  expect(button.getAttribute('aria-pressed')).toBe('true');
});

test('switching users ignores the previous request and loads the new identity', async (context) => {
  const { favorite, guard, button, dialog } = setup(context);
  const pending = Promise.withResolvers();
  const other = { displayName: 'Bea', email: 'bea@example.com' };
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(
      globalThis.Response.json({ data: { ...game, isLikedByCurrentUser: false, likesCount: 20 } }),
    );
  button.click();
  guard.mockReturnValue(other);
  favorite.setProfile(other);
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(fetch.mock.calls[1][0].searchParams.get('userEmail')).toBe(other.email);
  pending.resolve(globalThis.Response.json({ data: { isFavorited: true, likesCount: 99 } }));
  await pending.promise;
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(dialog.querySelector('[data-game-likes-count]').textContent).toBe('20');
});
