// Tracks MiniGames catalog activity, not actual gameplay scores.

export const AVATARS = {
  gamepad: '🎮',
  rocket: '🚀',
  fox: '🦊',
  robot: '🤖',
  leaf: '🌱',
  star: '⭐',
} as const;

export const AVATAR_COLORS = ['yellow', 'mint', 'lavender', 'pink', 'blue'] as const;

export interface ProfileSettings {
  nickname: string;
  bio: string;
  avatar: keyof typeof AVATARS;
  color: (typeof AVATAR_COLORS)[number];
  customAvatar: boolean;
  reducedMotion: boolean;
  achievementNotifications: boolean;
}

export type ActivityKind = 'view' | 'favorite' | 'unfavorite' | 'comment';

export interface ActivityInput {
  kind: ActivityKind;
  slug: string;
  name: string;
}

export interface Activity extends ActivityInput {
  at: number;
}

export type AchievementId =
  'first-look' | 'explorer' | 'collector' | 'voice' | 'trailblazer' | 'personal';

export interface PlayerData {
  version: 1;
  settings: ProfileSettings;
  explored: string[];
  favorites: string[];
  comments: number;
  history: Activity[];
  unlocked: Partial<Record<AchievementId, number>>;
}

export interface Achievement {
  id: AchievementId;
  icon: string;
  name: string;
  description: string;
  target: number;
  progress: (data: PlayerData) => number;
}

export const DEFAULT_SETTINGS: ProfileSettings = {
  nickname: '',
  bio: '',
  avatar: 'gamepad',
  color: 'yellow',
  customAvatar: false,
  reducedMotion: false,
  achievementNotifications: true,
};

export const HISTORY_LIMIT = 50;
const MAX_ITEMS = 1000;
const MAX_DATE = 8_640_000_000_000_000;

const KINDS = new Set<ActivityKind>(['view', 'favorite', 'unfavorite', 'comment']);

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Each badge has a progress rule; all badges share the same unlock logic.

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-look',
    icon: '🔎',
    name: 'First discovery',
    description: 'Explore your first game.',
    target: 1,
    progress: (d) => d.explored.length,
  },
  {
    id: 'explorer',
    icon: '🧭',
    name: 'Curious explorer',
    description: 'Explore five different games.',
    target: 5,
    progress: (d) => d.explored.length,
  },
  {
    id: 'collector',
    icon: '💛',
    name: 'Game collector',
    description: 'Save three games to Favorites on this browser.',
    target: 3,
    progress: (d) => d.favorites.length,
  },
  {
    id: 'voice',
    icon: '💬',
    name: 'Join the conversation',
    description: 'Post your first comment.',
    target: 1,
    progress: (d) => d.comments,
  },
  {
    id: 'trailblazer',
    icon: '🏅',
    name: 'Trailblazer',
    description: 'Explore ten different games.',
    target: 10,
    progress: (d) => d.explored.length,
  },
  {
    id: 'personal',
    icon: '✨',
    name: 'Make it yours',
    description: 'Save a customized player profile.',
    target: 1,
    progress: ({ settings: s }) =>
      Number(
        s.customAvatar ||
          s.nickname !== '' ||
          s.bio !== '' ||
          s.avatar !== DEFAULT_SETTINGS.avatar ||
          s.color !== DEFAULT_SETTINGS.color,
      ),
  },
];

const BADGE_IDS = new Set<string>(ACHIEVEMENTS.map((badge) => badge.id));

export const profileKey = (email: string): string =>
  `minigames:gafursz:profile:${encodeURIComponent(email.trim().toLowerCase())}`;

function emptyData(): PlayerData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    explored: [],
    favorites: [],
    comments: 0,
    history: [],
    unlocked: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_DATE;
}

export function isValidSettings(value: unknown): value is ProfileSettings {
  if (!isRecord(value)) return false;

  const { nickname, bio, avatar, color, customAvatar, reducedMotion, achievementNotifications } =
    value;

  return (
    typeof nickname === 'string' &&
    nickname === nickname.trim() &&
    (nickname.length === 0 || (nickname.length >= 2 && nickname.length <= 30)) &&
    typeof bio === 'string' &&
    bio.length <= 160 &&
    typeof avatar === 'string' &&
    Object.hasOwn(AVATARS, avatar) &&
    (AVATAR_COLORS as readonly unknown[]).includes(color) &&
    [customAvatar, reducedMotion, achievementNotifications].every(
      (item) => typeof item === 'boolean',
    )
  );
}

function isSlug(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function isSlugList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_ITEMS &&
    value.every(isSlug) &&
    new Set(value).size === value.length
  );
}

function isActivity(value: unknown): value is Activity {
  return (
    isRecord(value) &&
    KINDS.has(value.kind as ActivityKind) &&
    isSlug(value.slug) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    isTimestamp(value.at)
  );
}

export function readPlayerData(raw: string | undefined): PlayerData {
  if (!raw) return emptyData();

  try {
    const data: unknown = JSON.parse(raw);

    if (
      !isRecord(data) ||
      data.version !== 1 ||
      !isValidSettings(data.settings) ||
      !isSlugList(data.explored) ||
      !isSlugList(data.favorites) ||
      typeof data.comments !== 'number' ||
      !Number.isSafeInteger(data.comments) ||
      data.comments < 0 ||
      !Array.isArray(data.history) ||
      data.history.length > HISTORY_LIMIT ||
      !data.history.every(isActivity) ||
      !isRecord(data.unlocked) ||
      Object.entries(data.unlocked).some(
        ([id, at]) => !(isTimestamp(at) && (id === 'polyglot' || BADGE_IDS.has(id))),
      )
    )
      return emptyData();

    return {
      version: 1,
      settings: { ...data.settings },
      explored: [...data.explored],
      favorites: [...data.favorites],
      comments: data.comments,
      history: data.history.map((activity) => ({ ...activity })),
      unlocked: Object.fromEntries(
        Object.entries(data.unlocked).filter(([id]) => id !== 'polyglot'),
      ),
    };
  } catch {
    return emptyData();
  }
}

export class PlayerProgress {
  private readonly key: string;
  public data: PlayerData;
  public isPersistent: boolean;

  public constructor(
    email: string,
    private readonly storage?: Store,
    private readonly now = Date.now,
  ) {
    this.key = profileKey(email);
    this.isPersistent = Boolean(storage);

    try {
      this.data = readPlayerData(storage?.getItem(this.key) ?? undefined);
    } catch {
      this.data = emptyData();
      this.isPersistent = false;
    }
  }

  private save(): Achievement[] {
    const unlocked: Achievement[] = [];

    for (const badge of ACHIEVEMENTS) {
      if (Object.hasOwn(this.data.unlocked, badge.id) || badge.progress(this.data) < badge.target) {
        continue;
      }

      this.data.unlocked[badge.id] = this.now();
      unlocked.push(badge);
    }

    try {
      this.storage?.setItem(this.key, JSON.stringify(this.data));
      this.isPersistent = Boolean(this.storage);
    } catch {
      this.isPersistent = false;
    }

    return unlocked;
  }

  public record(input: ActivityInput): Achievement[] {
    const activity: Activity = { ...input, at: this.now() };
    if (!isActivity(activity)) return [];

    const last = this.data.history[0];

    const isView = input.kind === 'view';
    const wasView = last?.kind === 'view';
    const isSameGame = last?.slug === input.slug;
    const isRecent = last !== undefined && activity.at - last.at < 30_000;

    if (isView && wasView && isSameGame && isRecent) return [];

    if (input.kind === 'view' || input.kind === 'favorite') {
      const list = input.kind === 'view' ? this.data.explored : this.data.favorites;

      if (!list.includes(input.slug) && list.length < MAX_ITEMS) {
        list.push(input.slug);
      }
    } else if (input.kind === 'unfavorite') {
      this.data.favorites = this.data.favorites.filter((slug) => slug !== input.slug);
    } else if (this.data.comments < Number.MAX_SAFE_INTEGER) {
      this.data.comments += 1;
    }

    this.data.history.unshift(activity);
    this.data.history.length = Math.min(this.data.history.length, HISTORY_LIMIT);

    return this.save();
  }

  public updateSettings(settings: ProfileSettings): Achievement[] {
    if (!isValidSettings(settings)) {
      throw new TypeError('Invalid profile settings.');
    }

    this.data.settings = { ...settings };
    return this.save();
  }

  public reset(): void {
    this.data = emptyData();

    try {
      this.storage?.removeItem(this.key);
      this.isPersistent = Boolean(this.storage);
    } catch {
      this.isPersistent = false;
    }
  }
}
