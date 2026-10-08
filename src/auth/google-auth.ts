import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirebaseAuth } from './firebase-client';
import type { AuthProfile } from './email-auth';

export async function signInWithGoogle(): Promise<AuthProfile> {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(auth, provider);
  if (!user.email) {
    try {
      await signOut(auth);
    } catch {
      // The app remains a guest even if provider cleanup fails.
    }
    throw new Error('Google did not return an email address.');
  }
  return {
    displayName: user.displayName ?? '',
    email: user.email,
    ...(user.photoURL && { avatarUrl: user.photoURL }),
  };
}
