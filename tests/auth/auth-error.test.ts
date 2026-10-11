import { expect, test } from 'vitest';
import { getAuthErrorMessage } from '../../src/auth/auth-error';
import { FirebaseConfigError } from '../../src/auth/firebase-config';
import { SessionStorageError } from '../../src/auth/app-session';
import { RegistrationProfileError } from '../../src/auth/email-auth';

test('provider errors map to helpful messages without exposing raw provider details', () => {
  expect(getAuthErrorMessage({ code: 'auth/invalid-credential' })).toContain('email or password');
  expect(getAuthErrorMessage({ code: 'auth/email-already-in-use' })).toContain('logging in');
  expect(getAuthErrorMessage({ code: 'auth/network-request-failed' })).toContain('connection');
  expect(getAuthErrorMessage({ code: 'unknown', message: '<secret>' })).toBe(
    'Unable to sign in. Please try again.',
  );
  expect(getAuthErrorMessage('<secret>')).not.toContain('<secret>');
});

test('configuration, storage, and partial-registration failures remain actionable and distinct', () => {
  expect(getAuthErrorMessage(new FirebaseConfigError())).toContain('unavailable');
  expect(getAuthErrorMessage(new SessionStorageError())).toContain('storage');
  expect(getAuthErrorMessage(new RegistrationProfileError({}))).toContain('account was created');
});
