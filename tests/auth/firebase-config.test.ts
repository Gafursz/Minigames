import { expect, test } from 'vitest';
import { FirebaseConfigError, readFirebaseConfig } from '../../src/auth/firebase-config';
import type { FirebaseEnvironment } from '../../src/auth/firebase-config';

const environment: FirebaseEnvironment = {
  VITE_FIREBASE_API_KEY: 'test-public-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_APP_ID: 'test-app-id',
};

test('maps only the Firebase web-app configuration and trims surrounding whitespace', () => {
  expect(
    readFirebaseConfig({ ...environment, VITE_FIREBASE_PROJECT_ID: ' test-project ' }),
  ).toEqual({
    apiKey: 'test-public-api-key',
    authDomain: 'test-project.firebaseapp.com',
    projectId: 'test-project',
    appId: 'test-app-id',
  });
});

test.each(Object.keys(environment) as (keyof FirebaseEnvironment)[])(
  'rejects missing or blank %s before initializing the SDK',
  (key) => {
    for (const value of [undefined, '', ' '.repeat(3)]) {
      expect(() => readFirebaseConfig({ ...environment, [key]: value })).toThrow(
        FirebaseConfigError,
      );
    }
  },
);
