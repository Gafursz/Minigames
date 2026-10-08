import { expect, test, vi } from 'vitest';
import type { TestContext } from 'vitest';
import {
  AppSession,
  APP_SESSION_KEY,
  APP_SESSION_DURATION,
  readAppSession,
  SessionStorageError,
} from '../../src/auth/app-session';

const profile = { displayName: 'Alex99', email: 'alex@example.com' };
const now = Date.UTC(2026, 9, 7, 12);

function setup(context: TestContext) {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const data = new Map<string, string>([['unrelated-app', 'keep']]);
  const storage = {
    getItem: vi.fn((key: string) => data.get(key)),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
  const signOut = vi.fn(async () => {});
  const onChange = vi.fn();
  const onExpired = vi.fn();
  const session = new AppSession(() => storage, signOut, onChange, onExpired);
  context.onTestFinished(() => session.destroy());
  return { data, storage, signOut, onChange, onExpired, session };
}

test('session creation stores only the allowed profile fields and fixed numeric authentication time', (context) => {
  const { data, session } = setup(context);
  const extra = { uid: 'do-not-store', password: 'do-not-store', token: 'do-not-store' };
  session.establish({ ...profile, ...extra });
  expect(JSON.parse(data.get(APP_SESSION_KEY) ?? '')).toEqual({ ...profile, authenticatedAt: now });
  expect(data.get('unrelated-app')).toBe('keep');
  expect(session.current).toEqual({ ...profile, authenticatedAt: now });
});

test('reload restores the original time and activity never extends the five-minute lifetime', async (context) => {
  const { data, session, signOut, onExpired } = setup(context);
  const authenticatedAt = now - APP_SESSION_DURATION / 2;
  data.set(APP_SESSION_KEY, JSON.stringify({ ...profile, authenticatedAt }));
  expect(session.check()?.authenticatedAt).toBe(authenticatedAt);
  await vi.advanceTimersByTimeAsync(APP_SESSION_DURATION / 2 - 1);
  expect(session.check()?.authenticatedAt).toBe(authenticatedAt);
  expect(signOut).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(session.current).toBeUndefined();
  expect(data.has(APP_SESSION_KEY)).toBe(false);
  expect(onExpired).toHaveBeenCalledOnce();
  session.check();
  session.check();
  await session.readyForAuthentication();
  expect(signOut).toHaveBeenCalledOnce();
  expect(onExpired).toHaveBeenCalledOnce();
  expect(data.get('unrelated-app')).toBe('keep');
});

test('invalid stored data is removed and provider cleanup finishes before the next auth attempt', async (context) => {
  const { data, session, signOut, onExpired } = setup(context);
  const pending = Promise.withResolvers<void>();
  signOut.mockReturnValue(pending.promise);
  data.set(APP_SESSION_KEY, '{broken');
  expect(session.check()).toBeUndefined();
  await Promise.resolve();
  const ready = vi.fn();
  const cleanup = session.readyForAuthentication();
  void cleanup.then(ready);
  await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  pending.resolve();
  await cleanup;
  expect(data.has(APP_SESSION_KEY)).toBe(false);
  expect(onExpired).not.toHaveBeenCalled();
  expect(data.get('unrelated-app')).toBe('keep');
});

test('missing app data stays guest and clears Firebase identity once without restoring it', async (context) => {
  const { session, signOut } = setup(context);
  session.check();
  session.check();
  await session.readyForAuthentication();
  expect(session.current).toBeUndefined();
  expect(signOut).toHaveBeenCalledOnce();
});

test('manual stored-time expiry is caught by a check before navigation or a future protected action', async (context) => {
  const { session, data, signOut, onExpired } = setup(context);
  session.establish(profile);
  data.set(
    APP_SESSION_KEY,
    JSON.stringify({ ...profile, authenticatedAt: now - APP_SESSION_DURATION }),
  );
  expect(session.check()).toBeUndefined();
  await session.readyForAuthentication();
  expect(signOut).toHaveBeenCalledOnce();
  expect(onExpired).toHaveBeenCalledOnce();
});

test('logout clears only this session and remains guest if storage removal or signOut fails', async (context) => {
  const { session, storage, data, signOut } = setup(context);
  session.establish(profile);
  storage.removeItem.mockImplementation(() => {
    throw new Error('storage blocked');
  });
  signOut.mockRejectedValue(new Error('provider cleanup failed'));
  session.logout();
  expect(session.current).toBeUndefined();
  expect(session.check()).toBeUndefined();
  await expect(session.readyForAuthentication()).resolves.toBeUndefined();
  expect(data.get('unrelated-app')).toBe('keep');
});

test('storage failures do not create a successful app session or crash guest startup', (context) => {
  const { session, storage } = setup(context);
  storage.setItem.mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() => session.establish(profile)).toThrow(SessionStorageError);
  expect(session.current).toBeUndefined();
  storage.getItem.mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => session.check()).not.toThrow();
  expect(session.current).toBeUndefined();
});

test('destroy cancels the session expiration timer', async (context) => {
  const { session, onExpired } = setup(context);
  session.establish({ ...profile, avatarUrl: 'https://example.com/avatar.jpg' });
  expect(session.current?.avatarUrl).toBe('https://example.com/avatar.jpg');
  session.destroy();
  await vi.advanceTimersByTimeAsync(APP_SESSION_DURATION);
  expect(onExpired).not.toHaveBeenCalled();
});

test('session parsing rejects malformed fields, credentials, future times, and unsafe avatar URLs', () => {
  const valid = { ...profile, authenticatedAt: now };
  for (const value of [
    [],
    'text',
    {},
    { ...valid, displayName: 42 },
    { ...valid, email: 'bad' },
    { ...valid, authenticatedAt: 'today' },
    { ...valid, authenticatedAt: now + 1 },
    { ...valid, authenticatedAt: -1 },
    { ...valid, token: 'secret' },
    { ...valid, avatarUrl: 12 },
    { ...valid, avatarUrl: 'javascript:evil()' },
  ]) {
    expect(readAppSession(JSON.stringify(value), now).kind).toBe('invalid');
  }
  expect(readAppSession(undefined, now).kind).toBe('missing');
  expect(readAppSession(JSON.stringify(valid), now).kind).toBe('valid');
  expect(readAppSession(JSON.stringify(valid), now + APP_SESSION_DURATION).kind).toBe('expired');
});
