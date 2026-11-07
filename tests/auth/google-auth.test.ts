import { beforeEach, expect, test, vi } from 'vitest';
import { signInWithGoogle } from '../../src/auth/google-auth';

const sdk = vi.hoisted(() => ({
  auth: { name: 'test-auth' },
  getAuth: vi.fn(),
  parameters: vi.fn(),
  popup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../../src/auth/firebase-client', () => ({ getFirebaseAuth: sdk.getAuth }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    providerId = 'google.com';
    setCustomParameters = sdk.parameters;
  },
  signInWithPopup: sdk.popup,
  signOut: sdk.signOut,
}));

beforeEach(() => {
  sdk.getAuth.mockReset().mockResolvedValue(sdk.auth);
  sdk.parameters.mockReset();
  sdk.popup.mockReset();
  sdk.signOut.mockReset().mockResolvedValue(undefined);
});

test('Google provider opens the account chooser and returns only session profile fields', async () => {
  sdk.popup.mockResolvedValue({
    user: {
      displayName: 'Alex Player',
      email: 'alex@example.com',
      photoURL: 'https://example.com/me.jpg',
      uid: 'private-id',
      refreshToken: 'private-token',
    },
  });
  await expect(signInWithGoogle()).resolves.toEqual({
    displayName: 'Alex Player',
    email: 'alex@example.com',
    avatarUrl: 'https://example.com/me.jpg',
  });
  expect(sdk.parameters).toHaveBeenCalledExactlyOnceWith({ prompt: 'select_account' });
  expect(sdk.popup).toHaveBeenCalledExactlyOnceWith(
    sdk.auth,
    expect.objectContaining({ providerId: 'google.com' }),
  );
});

test('a canceled popup rejects without fake success and the next attempt can succeed', async () => {
  const error = { code: 'auth/popup-closed-by-user' };
  sdk.popup
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce({ user: { email: 'alex@example.com' } });
  await expect(signInWithGoogle()).rejects.toBe(error);
  await expect(signInWithGoogle()).resolves.toEqual({ displayName: '', email: 'alex@example.com' });
});

test('missing email rejects and signs out even if cleanup fails', async () => {
  sdk.popup.mockResolvedValue({ user: { displayName: 'No email' } });
  sdk.signOut.mockRejectedValue(new Error('cleanup unavailable'));
  await expect(signInWithGoogle()).rejects.toThrow('email address');
  expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith(sdk.auth);
});

test('configuration failure does not start a popup', async () => {
  sdk.getAuth.mockRejectedValue(new Error('missing configuration'));
  await expect(signInWithGoogle()).rejects.toThrow('configuration');
  expect(sdk.popup).not.toHaveBeenCalled();
});
