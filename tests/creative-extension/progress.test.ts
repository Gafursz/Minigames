import { expect, test, onTestFinished } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  PlayerProgress,
  DEFAULT_SETTINGS,
  readPlayerData,
  profileKey,
} from '../../src/features/profile/player-progress';

function memoryStore(): Storage {
  const dom = new JSDOM('', { url: 'https://minigames.test' });
  onTestFinished(() => dom.window.close());
  return dom.window.localStorage;
}

test('records distinct discoveries, suppresses immediate reloads, and unlocks each badge once', () => {
  let now = 100_000;
  const progress = new PlayerProgress('one@example.com', memoryStore(), () => now);
  expect(
    progress.record({ kind: 'view', slug: 'alpha', name: 'Alpha' }).map((badge) => badge.id),
  ).toEqual(['first-look']);
  now += 10_000;
  expect(progress.record({ kind: 'view', slug: 'alpha', name: 'Alpha' })).toEqual([]);
  expect(progress.data.history).toHaveLength(1);
  now += 30_000;
  progress.record({ kind: 'view', slug: 'alpha', name: 'Alpha' });
  expect(progress.data.history).toHaveLength(2);
  expect(progress.data.explored).toHaveLength(1);
  for (const slug of ['beta', 'gamma', 'delta', 'epsilon'])
    progress.record({ kind: 'view', slug, name: slug });
  expect(progress.data.unlocked.explorer).toBe(now);
  expect(progress.data.unlocked['first-look']).toBe(100_000);
});

test('favorites count distinct games and earned collector badges survive removing a favorite', () => {
  const progress = new PlayerProgress('one@example.com', memoryStore());
  for (const slug of ['alpha', 'alpha', 'beta', 'gamma'])
    progress.record({ kind: 'favorite', slug, name: slug });
  expect(progress.data.favorites).toEqual(['alpha', 'beta', 'gamma']);
  expect(progress.data.unlocked.collector).toBeGreaterThan(0);
  progress.record({ kind: 'unfavorite', slug: 'alpha', name: 'Alpha' });
  expect(progress.data.favorites).toEqual(['beta', 'gamma']);
  expect(progress.data.unlocked.collector).toBeGreaterThan(0);
});

test('preserves lifetime statistics while retaining only the 50 most recent activities', () => {
  let now = 100_000;
  const progress = new PlayerProgress('one@example.com', memoryStore(), () => ++now);
  for (let index = 0; index < 60; index += 1)
    progress.record({ kind: 'comment', slug: 'alpha', name: `Comment ${index}` });
  expect(progress.data.comments).toBe(60);
  expect(progress.data.history).toHaveLength(50);
  expect(progress.data.history[0].name).toBe('Comment 59');
  expect(progress.data.history[49].name).toBe('Comment 10');
});

test('restores settings and achievements without sharing progress between accounts', () => {
  const storage = memoryStore();
  const progress = new PlayerProgress('One@example.com', storage);
  expect(progress.updateSettings({ ...DEFAULT_SETTINGS })).toEqual([]);
  progress.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'Gafur', avatar: 'rocket' });
  const restored = new PlayerProgress('one@example.com', storage);
  expect(restored.data.settings.nickname).toBe('Gafur');
  expect(restored.data.unlocked.personal).toBeGreaterThan(0);
  expect(new PlayerProgress('two@example.com', storage).data.unlocked).toEqual({});
});

test.each([undefined, '', '{bad json', 'null', '[]', '{"version":99}', '{"version":1}'])(
  'recovers a usable empty profile from %s',
  (raw) => {
    const data = readPlayerData(raw);
    expect(data.comments).toBe(0);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
  },
);

test('rejects unsupported avatars, malformed histories, duplicate slugs and forged badge fields', () => {
  const progress = new PlayerProgress('one@example.com');
  const original = progress.data;
  for (const bad of [
    { ...original, settings: { ...DEFAULT_SETTINGS, avatar: '__proto__' } },
    { ...original, history: [{ kind: 'view', slug: '../escape', name: 'Bad', at: 1 }] },
    { ...original, explored: ['alpha', 'alpha'] },
    { ...original, comments: -1 },
    { ...original, unlocked: { 'unknown-badge': 1 } },
    { ...original, unlocked: { 'first-look': Number.MAX_SAFE_INTEGER } },
    {
      ...original,
      history: [{ kind: 'view', slug: 'alpha', name: 'Alpha', at: Number.MAX_SAFE_INTEGER }],
    },
  ])
    expect(readPlayerData(JSON.stringify(bad)).unlocked).toEqual({});
  expect(() => progress.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'x' })).toThrow();
  expect(() => progress.updateSettings({ ...DEFAULT_SETTINGS, bio: 'x'.repeat(161) })).toThrow();
});

test('storage failures keep the feature usable and report that persistence is unavailable', () => {
  const saved = memoryStore();
  const storage = {
    getItem: (key: string) => saved.getItem(key),
    setItem: () => {
      throw new Error('Quota exceeded');
    },
    removeItem: (key: string) => saved.removeItem(key),
  };
  const progress = new PlayerProgress('one@example.com', storage);
  progress.record({ kind: 'comment', slug: 'alpha', name: 'Alpha' });
  expect(progress.data.comments).toBe(1);
  expect(progress.isPersistent).toBe(false);
  expect(new PlayerProgress('guest@example.com').isPersistent).toBe(false);
});

test('reset clears only this account’s extension data', () => {
  const storage = memoryStore();
  storage.setItem('unrelated', 'keep');
  const progress = new PlayerProgress('one@example.com', storage);
  progress.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'Gafur' });
  progress.reset();
  expect(storage.getItem(profileKey('one@example.com'))).toBeNull();
  expect(storage.getItem('unrelated')).toBe('keep');
  expect(progress.data).toEqual(readPlayerData(undefined));
});

test('awards Trailblazer only after ten distinct game discoveries', () => {
  const progress = new PlayerProgress('one@example.com', memoryStore());
  for (let index = 0; index < 9; index += 1) {
    progress.record({ kind: 'view', slug: `game-${index}`, name: `Game ${index}` });
  }
  expect(progress.data.unlocked.trailblazer).toBeUndefined();
  const unlocked = progress.record({ kind: 'view', slug: 'game-9', name: 'Game 9' });
  expect(unlocked.map((badge) => badge.id)).toEqual(['trailblazer']);
  expect(progress.data.unlocked.trailblazer).toBeGreaterThan(0);
});

test('migrates existing two-extension saved progress without losing profile data', () => {
  const player = new PlayerProgress('one@example.com');
  player.record({ kind: 'view', slug: 'alpha', name: 'Alpha' });
  player.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'Player' });
  const legacy = {
    ...player.data,
    languages: ['en', 'ru'],
    unlocked: { ...player.data.unlocked, polyglot: 123_456 },
  };
  const data = readPlayerData(JSON.stringify(legacy));
  expect(data.settings.nickname).toBe('Player');
  expect(data.explored).toEqual(['alpha']);
  expect(data.unlocked['first-look']).toBeGreaterThan(0);
  expect(data.unlocked).not.toHaveProperty('polyglot');
  expect(data).not.toHaveProperty('languages');
});
