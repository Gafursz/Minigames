// Dependency-free regression checks for the profile model.
// Run with: npm run test:profile:smoke (requires Node 22+).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  PlayerProgress,
  profileKey,
  readPlayerData,
} from '../../src/features/profile/player-progress.ts';

function memoryStore() {
  const records = new Map();
  return {
    getItem: (key) => records.get(key) ?? undefined,
    setItem: (key, value) => records.set(key, String(value)),
    removeItem: (key) => records.delete(key),
  };
}

test('six milestones unlock exactly once; duplicate views do not inflate discoveries', () => {
  let clock = 100_000;
  const progress = new PlayerProgress('One@example.com', memoryStore(), () => clock);
  assert.equal(ACHIEVEMENTS.length, 6);
  assert.deepEqual(
    progress.record({ kind: 'view', slug: 'game-0', name: 'Game 0' }).map((b) => b.id),
    ['first-look'],
  );
  clock += 1000;
  assert.deepEqual(progress.record({ kind: 'view', slug: 'game-0', name: 'Game 0' }), []);
  for (let index = 1; index < 10; index += 1) {
    clock += 1000;
    progress.record({ kind: 'view', slug: `game-${index}`, name: `Game ${index}` });
  }
  assert.equal(progress.data.explored.length, 10);
  assert.deepEqual(
    Object.keys(progress.data.unlocked).toSorted((a, b) => a.localeCompare(b)),
    ['explorer', 'first-look', 'trailblazer'],
  );
  assert.equal(progress.data.history.length, 10);
});

test('favorites, confirmed comments and customization unlock their respective badges', () => {
  const progress = new PlayerProgress('one@example.com', memoryStore());
  for (const slug of ['alpha', 'alpha', 'beta', 'gamma']) {
    progress.record({ kind: 'favorite', slug, name: slug });
  }
  assert.equal(progress.data.favorites.length, 3);
  const earned = progress.data.unlocked.collector;
  progress.record({ kind: 'unfavorite', slug: 'alpha', name: 'Alpha' });
  assert.equal(progress.data.unlocked.collector, earned);
  progress.record({ kind: 'comment', slug: 'gamma', name: 'Gamma' });
  assert.ok(progress.data.unlocked.voice);
  assert.deepEqual(progress.updateSettings({ ...DEFAULT_SETTINGS }), []);
  progress.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'Player', avatar: 'fox' });
  assert.ok(progress.data.unlocked.personal);
});

test('each user has separate durable progress; reset does not clear other keys', () => {
  const storage = memoryStore();
  storage.setItem('unrelated', 'untouched');
  const first = new PlayerProgress('User@Example.com', storage);
  first.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'Player' });
  assert.equal(new PlayerProgress('user@example.com', storage).data.settings.nickname, 'Player');
  assert.equal(new PlayerProgress('second@example.com', storage).data.settings.nickname, '');
  first.reset();
  assert.equal(storage.getItem(profileKey('user@example.com')), undefined);
  assert.equal(storage.getItem('unrelated'), 'untouched');
});

test('history remains bounded while lifetime counts are retained', () => {
  let now = 100_000;
  const progress = new PlayerProgress('user@example.com', memoryStore(), () => ++now);
  for (let index = 0; index < 70; index += 1) {
    progress.record({ kind: 'comment', slug: 'alpha', name: 'Alpha' });
  }
  assert.equal(progress.data.comments, 70);
  assert.equal(progress.data.history.length, HISTORY_LIMIT);
});

test('tampered browser data is rejected and old language-only badge is migrated away', () => {
  const fresh = readPlayerData('bad JSON');
  assert.equal(fresh.comments, 0);
  const invalid = { ...fresh, settings: { ...DEFAULT_SETTINGS, avatar: '__proto__' } };
  assert.deepEqual(readPlayerData(JSON.stringify(invalid)), fresh);
  assert.deepEqual(
    readPlayerData(JSON.stringify({ ...fresh, explored: ['alpha', 'alpha'] })),
    fresh,
  );
  assert.deepEqual(
    readPlayerData(
      JSON.stringify({ ...fresh, history: [{ kind: 'view', slug: '../x', name: 'X', at: 1 }] }),
    ),
    fresh,
  );
  const validOld = {
    ...fresh,
    explored: ['alpha'],
    unlocked: { 'first-look': 12_345, polyglot: 22_222 },
  };
  const restored = readPlayerData(JSON.stringify(validOld));
  assert.deepEqual(restored.explored, ['alpha']);
  assert.equal(restored.unlocked['first-look'], 12_345);
  assert.equal(Object.hasOwn(restored.unlocked, 'polyglot'), false);
});

test('bad settings and a blocked storage API fail safely', () => {
  const storage = {
    getItem: () => {},
    setItem: () => {
      throw new Error('Quota');
    },
    removeItem: () => {},
  };
  const progress = new PlayerProgress('user@example.com', storage);
  assert.throws(() => progress.updateSettings({ ...DEFAULT_SETTINGS, nickname: 'x' }), TypeError);
  assert.throws(
    () => progress.updateSettings({ ...DEFAULT_SETTINGS, bio: 'x'.repeat(161) }),
    TypeError,
  );
  progress.record({ kind: 'view', slug: 'alpha', name: 'Alpha' });
  assert.equal(progress.isPersistent, false);
  assert.equal(progress.data.explored.length, 1);
});
