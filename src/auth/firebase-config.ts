import type { FirebaseOptions } from 'firebase/app';

export type FirebaseEnvironment = Pick<
  ImportMetaEnv,
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_APP_ID'
>;

export class FirebaseConfigError extends Error {
  constructor() {
    super('Firebase web-app configuration is incomplete.');
    this.name = 'FirebaseConfigError';
  }
}

export function readFirebaseConfig(
  environment: FirebaseEnvironment = import.meta.env,
): FirebaseOptions {
  const options = {
    apiKey: environment.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: environment.VITE_FIREBASE_PROJECT_ID?.trim(),
    appId: environment.VITE_FIREBASE_APP_ID?.trim(),
  };
  if (Object.values(options).some((value) => !value)) throw new FirebaseConfigError();
  return options;
}
