import { FirebaseConfigError } from './firebase-config';
import { RegistrationProfileError } from './email-auth';
import { SessionStorageError } from './app-session';

const messages: Record<string, string> = {
  'auth/invalid-credential': 'The email or password is incorrect. Please try again.',
  'auth/wrong-password': 'The email or password is incorrect. Please try again.',
  'auth/user-not-found': 'The email or password is incorrect. Please try again.',
  'auth/email-already-in-use': 'An account already uses this email. Try logging in.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password and try again.',
  'auth/password-does-not-meet-requirements':
    'This password does not meet the account policy. Choose a stronger password.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
  'auth/user-disabled': 'This account is disabled. Contact the site owner.',
  'auth/operation-not-allowed': 'Sign-in is unavailable right now. Please try again later.',
  'auth/invalid-api-key': 'Sign-in is unavailable right now. Please try again later.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseConfigError)
    return 'Sign-in is unavailable right now. Please try again later.';
  if (error instanceof SessionStorageError) return error.message;
  if (error instanceof RegistrationProfileError)
    return 'Your account was created, but its profile could not be saved. Please try logging in.';
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? (messages[error.code] ?? 'Unable to sign in. Please try again.')
    : 'Unable to sign in. Please try again.';
}
