import type { AuthProfile } from './email-auth';

export const APP_SESSION_KEY = 'minigames:gafursz:app-session';
export const APP_SESSION_DURATION = 5 * 60 * 1000;
export interface AppSessionData extends AuthProfile {
  authenticatedAt: number;
}
type SessionStorage = Pick<Storage, 'setItem' | 'removeItem'> & {
  getItem: (key: string) => string | null | undefined;
};
type SessionResult =
  { kind: 'valid'; session: AppSessionData } | { kind: 'missing' | 'invalid' | 'expired' };

export class SessionStorageError extends Error {
  constructor() {
    super('Browser storage is unavailable. Allow site storage and try signing in again.');
    this.name = 'SessionStorageError';
  }
}

export function readAppSession(raw: string | null | undefined, now: number): SessionResult {
  if (raw === null || raw === undefined) return { kind: 'missing' };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: 'invalid' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { kind: 'invalid' };
  const allowed = new Set(['displayName', 'email', 'authenticatedAt', 'avatarUrl']);
  if (
    Object.keys(value).some((key) => !allowed.has(key)) ||
    !('displayName' in value) ||
    typeof value.displayName !== 'string' ||
    !('email' in value) ||
    typeof value.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
    !('authenticatedAt' in value) ||
    typeof value.authenticatedAt !== 'number' ||
    !Number.isSafeInteger(value.authenticatedAt) ||
    value.authenticatedAt < 0 ||
    value.authenticatedAt > now ||
    ('avatarUrl' in value &&
      (typeof value.avatarUrl !== 'string' || !/^https?:\/\//.test(value.avatarUrl)))
  ) {
    return { kind: 'invalid' };
  }
  if (now - value.authenticatedAt >= APP_SESSION_DURATION) return { kind: 'expired' };
  return {
    kind: 'valid',
    session: {
      displayName: value.displayName,
      email: value.email,
      authenticatedAt: value.authenticatedAt,
      ...('avatarUrl' in value &&
        typeof value.avatarUrl === 'string' && { avatarUrl: value.avatarUrl }),
    },
  };
}

export class AppSession {
  private value: AppSessionData | undefined;
  private timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private cleanup: Promise<void> = Promise.resolve();
  private hasChecked = false;
  private lastRejected: string | undefined;

  constructor(
    private readonly getStorage: () => SessionStorage | undefined,
    private readonly signOut: () => Promise<void>,
    private readonly onChange: (session: AppSessionData | undefined) => void,
    private readonly onExpired: () => void,
  ) {}

  private publish(session: AppSessionData | undefined): void {
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
    const isChanged = JSON.stringify(this.value) !== JSON.stringify(session);
    this.value = session ? Object.freeze(session) : undefined;
    if (session)
      this.timer = globalThis.setTimeout(
        () => this.check(),
        Math.max(0, session.authenticatedAt + APP_SESSION_DURATION - Date.now()),
      );
    if (isChanged) this.onChange(this.value);
  }

  private async signOutAfter(previous: Promise<void>): Promise<void> {
    await previous;
    try {
      await this.signOut();
    } catch {
      // Local guest state is authoritative. Startup will attempt provider cleanup again.
    }
  }

  private clearIdentity(): void {
    this.cleanup = this.signOutAfter(this.cleanup);
    this.publish(undefined);
    try {
      const storage = this.getStorage();
      this.lastRejected = storage?.getItem(APP_SESSION_KEY) ?? undefined;
      storage?.removeItem(APP_SESSION_KEY);
    } catch {
      /*
      Keep guest state if storage is blocked.
      */
    }
  }

  public get current(): AppSessionData | undefined {
    return this.value;
  }

  public check(): AppSessionData | undefined {
    let raw: string | undefined;
    try {
      raw = this.getStorage()?.getItem(APP_SESSION_KEY) ?? undefined;
    } catch {
      /*
      Recover as guest.
      */
    }
    const result = readAppSession(raw, Date.now());
    if (result.kind === 'valid' && raw !== this.lastRejected) {
      this.hasChecked = true;
      this.lastRejected = undefined;
      this.publish(result.session);
      return this.value;
    }
    const shouldRecover =
      !this.hasChecked || Boolean(this.value) || (raw !== undefined && raw !== this.lastRejected);
    this.hasChecked = true;
    this.lastRejected = raw;
    if (shouldRecover) {
      this.clearIdentity();
      if (result.kind === 'expired') this.onExpired();
    }
    return undefined;
  }

  public async readyForAuthentication(): Promise<void> {
    await this.cleanup;
  }

  public establish(profile: AuthProfile): void {
    const session: AppSessionData = {
      displayName: profile.displayName,
      email: profile.email,
      authenticatedAt: Date.now(),
      ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
    };
    const raw = JSON.stringify(session);
    if (readAppSession(raw, Date.now()).kind !== 'valid') throw new SessionStorageError();
    try {
      const storage = this.getStorage();
      if (!storage) throw new SessionStorageError();
      storage.setItem(APP_SESSION_KEY, raw);
    } catch {
      throw new SessionStorageError();
    }
    this.hasChecked = true;
    this.lastRejected = undefined;
    this.publish(session);
  }

  public logout(): void {
    this.hasChecked = true;
    this.lastRejected = undefined;
    this.clearIdentity();
  }

  public destroy(): void {
    globalThis.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
