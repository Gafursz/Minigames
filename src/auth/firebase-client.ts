import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { readFirebaseConfig } from './firebase-config';

const FIREBASE_APP_NAME = 'minigames';
class FirebaseClient {
  private ready: Promise<Auth> | undefined;

  private async initialize(): Promise<Auth> {
    const config = readFirebaseConfig();
    const app =
      getApps().find(({ name }) => name === FIREBASE_APP_NAME) ??
      initializeApp(config, FIREBASE_APP_NAME);
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
    return auth;
  }

  public async getAuth(): Promise<Auth> {
    const pending = (this.ready ??= this.initialize());
    try {
      return await pending;
    } catch (error) {
      // Clear only this failed attempt, including failures before the SDK's first await.
      if (this.ready === pending) this.ready = undefined;
      throw error;
    }
  }
}

const client = new FirebaseClient();

export function getFirebaseAuth(): Promise<Auth> {
  return client.getAuth();
}

export async function prepareFirebaseAuth(): Promise<void> {
  try {
    await getFirebaseAuth();
  } catch {
    // Public pages remain usable. The form's real auth request will display the failure.
  }
}
