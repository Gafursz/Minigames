import { beforeEach, expect, test, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  getApps: vi.fn(),
  initializeApp: vi.fn(),
  getAuth: vi.fn(),
  setPersistence: vi.fn(),
  authStateReady: vi.fn(),
}));
vi.mock('firebase/app', () => ({ getApps: sdk.getApps, initializeApp: sdk.initializeApp }));
vi.mock('firebase/auth', () => ({
  getAuth: sdk.getAuth,
  setPersistence: sdk.setPersistence,
  browserLocalPersistence: 'local',
}));

beforeEach((context) => {
  vi.resetModules();
  for (const mock of Object.values(sdk)) mock.mockReset();
  sdk.getApps.mockReturnValue([]);
  sdk.initializeApp.mockReturnValue({ name: 'minigames' });
  sdk.getAuth.mockReturnValue({ authStateReady: sdk.authStateReady });
  sdk.setPersistence.mockResolvedValue(undefined);
  sdk.authStateReady.mockResolvedValue(undefined);
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test-project.firebaseapp.com');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');
  context.onTestFinished(() => {
    vi.unstubAllEnvs();
  });
});

test('concurrent callers share one initialized Auth instance and await persistence recovery', async () => {
  const { getFirebaseAuth } = await import('../../src/auth/firebase-client');
  const first = getFirebaseAuth();
  const second = getFirebaseAuth();
  const auth = await first;
  expect(await second).toBe(auth);
  expect(sdk.initializeApp).toHaveBeenCalledExactlyOnceWith(
    {
      apiKey: 'test-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-project',
      appId: 'test-app-id',
    },
    'minigames',
  );
  expect(sdk.setPersistence).toHaveBeenCalledExactlyOnceWith(auth, 'local');
  expect(sdk.authStateReady).toHaveBeenCalledOnce();
  expect(await getFirebaseAuth()).toBe(auth);
});

test('reuses only the app named minigames and does not initialize it twice', async () => {
  const existing = { name: 'minigames' };
  sdk.getApps.mockReturnValue([{ name: '[DEFAULT]' }, existing]);
  const { getFirebaseAuth } = await import('../../src/auth/firebase-client');
  await getFirebaseAuth();
  expect(sdk.initializeApp).not.toHaveBeenCalled();
  expect(sdk.getAuth).toHaveBeenCalledWith(existing);
});

test('missing config fails without calling Firebase and can be retried', async () => {
  vi.stubEnv('VITE_FIREBASE_API_KEY', '');
  const { getFirebaseAuth } = await import('../../src/auth/firebase-client');
  await expect(getFirebaseAuth()).rejects.toThrow('configuration is incomplete');
  expect(sdk.getAuth).not.toHaveBeenCalled();
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
  await expect(getFirebaseAuth()).resolves.toHaveProperty('authStateReady');
});

test('a failed persistence setup does not leave a permanently rejected initialization cache', async () => {
  sdk.setPersistence.mockRejectedValueOnce(new Error('storage unavailable'));
  const { getFirebaseAuth } = await import('../../src/auth/firebase-client');
  await expect(getFirebaseAuth()).rejects.toThrow('storage unavailable');
  await expect(getFirebaseAuth()).resolves.toHaveProperty('authStateReady');
  expect(sdk.setPersistence).toHaveBeenCalledTimes(2);
});

test('public-page warmup absorbs setup failure while a real auth request still reports it', async () => {
  vi.stubEnv('VITE_FIREBASE_API_KEY', '');
  const { prepareFirebaseAuth, getFirebaseAuth } = await import('../../src/auth/firebase-client');
  await expect(prepareFirebaseAuth()).resolves.toBeUndefined();
  await expect(getFirebaseAuth()).rejects.toThrow('configuration is incomplete');
  expect(sdk.initializeApp).not.toHaveBeenCalled();
});
