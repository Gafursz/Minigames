import { beforeEach, expect, test, vi } from 'vitest';
import { emailAuth, RegistrationProfileError } from '../../src/auth/email-auth';

const sdk = vi.hoisted(() => ({
  client: { name: 'test-auth' },
  getAuth: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../../src/auth/firebase-client', () => ({ getFirebaseAuth: sdk.getAuth }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: sdk.login,
  createUserWithEmailAndPassword: sdk.register,
  updateProfile: sdk.updateProfile,
  signOut: sdk.signOut,
}));

beforeEach(() => {
  sdk.getAuth.mockReset().mockResolvedValue(sdk.client);
  sdk.login.mockReset();
  sdk.register.mockReset();
  sdk.updateProfile.mockReset().mockResolvedValue(undefined);
  sdk.signOut.mockReset().mockResolvedValue(undefined);
});

test('login calls Firebase with email and unchanged password and returns only profile data', async () => {
  sdk.login.mockResolvedValue({
    user: {
      displayName: 'Alex',
      email: 'alex@example.com',
      photoURL: 'https://example.com/avatar.jpg',
      uid: 'private-id',
      refreshToken: 'private-token',
    },
  });
  await expect(emailAuth.login(' alex@example.com ', 'abc 12')).resolves.toEqual({
    displayName: 'Alex',
    email: 'alex@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
  });
  expect(sdk.login).toHaveBeenCalledExactlyOnceWith(sdk.client, 'alex@example.com', 'abc 12');
  expect(sdk.register).not.toHaveBeenCalled();
});

test('registration saves displayName before reporting success', async () => {
  const user = { email: 'alex@example.com' };
  sdk.register.mockResolvedValue({ user });
  const pending = Promise.withResolvers<void>();
  sdk.updateProfile.mockReturnValue(pending.promise);
  const finished = vi.fn();
  const result = emailAuth.register('Alex99', 'alex@example.com', 'Abcd1!');
  void result.then(finished);
  await vi.waitFor(() =>
    expect(sdk.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Alex99' }),
  );
  expect(finished).not.toHaveBeenCalled();
  pending.resolve();
  await expect(result).resolves.toEqual({ displayName: 'Alex99', email: 'alex@example.com' });
  expect(sdk.register).toHaveBeenCalledExactlyOnceWith(sdk.client, 'alex@example.com', 'Abcd1!');
});

test('a registration profile failure signs out and rejects rather than creating an app session', async () => {
  sdk.register.mockResolvedValue({ user: { email: 'alex@example.com' } });
  sdk.updateProfile.mockRejectedValue(new Error('profile network failure'));
  sdk.signOut.mockRejectedValue(new Error('cleanup failure'));
  await expect(emailAuth.register('Alex99', 'alex@example.com', 'Abcd1!')).rejects.toBeInstanceOf(
    RegistrationProfileError,
  );
  expect(sdk.signOut).toHaveBeenCalledWith(sdk.client);
});

test('provider failure is propagated without fake profile data and can be retried', async () => {
  const failure = { code: 'auth/invalid-credential' };
  sdk.login.mockRejectedValueOnce(failure).mockResolvedValueOnce({ user: {} });
  await expect(emailAuth.login('alex@example.com', 'abcdef')).rejects.toBe(failure);
  await expect(emailAuth.login('alex@example.com', 'abcdef')).resolves.toEqual({
    displayName: '',
    email: 'alex@example.com',
  });
});

test('logout dispatches Firebase signOut', async () => {
  await emailAuth.logout();
  expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith(sdk.client);
});
