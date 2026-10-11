import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase-client';

export interface AuthProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface EmailAuth {
  login(email: string, password: string): Promise<AuthProfile>;
  register(username: string, email: string, password: string): Promise<AuthProfile>;
  logout(): Promise<void>;
}

function profileOf(user: User, email: string): AuthProfile {
  return {
    displayName: user.displayName ?? '',
    email: user.email ?? email,
    ...(user.photoURL && { avatarUrl: user.photoURL }),
  };
}

export class RegistrationProfileError extends Error {
  constructor(options: ErrorOptions) {
    super('The account was created, but its profile name could not be saved.', options);
    this.name = 'RegistrationProfileError';
  }
}

export const emailAuth: EmailAuth = {
  async login(email, password) {
    const auth = await getFirebaseAuth();
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
    return profileOf(user, email.trim());
  },
  async register(username, email, password) {
    const auth = await getFirebaseAuth();
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      await updateProfile(user, { displayName: username });
    } catch (error) {
      // No app session is created for a partially completed registration.
      try {
        await signOut(auth);
      } catch {
        /*
        The app remains a guest even if provider cleanup fails.
        */
      }
      throw new RegistrationProfileError({ cause: error });
    }
    return { ...profileOf(user, email.trim()), displayName: username };
  },
  async logout() {
    await signOut(await getFirebaseAuth());
  },
};
