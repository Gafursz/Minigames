import type { AuthProfile } from '../auth/email-auth';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { appHref } from '../router/links';
import { escapeHtml } from '../utils/html';
import { t, formatDate, formatNumber } from '../utils/text';
import {
  ACHIEVEMENTS,
  AVATARS,
  AVATAR_COLORS,
  isValidSettings,
  type ActivityKind,
  type PlayerProgress,
  type ProfileSettings,
} from '../features/profile/player-progress';

const ACTIVITY: Record<ActivityKind, { icon: string; label: string }> = {
  view: { icon: '↗', label: 'Explored' },
  comment: { icon: '✉', label: 'Posted a comment' },
  favorite: { icon: '♡', label: 'Saved to Favorites' },
  unfavorite: { icon: '♡', label: 'Removed from Favorites' },
};
const labelCase = (value: string): string => value[0].toUpperCase() + value.slice(1);
const libraryLink = (): string =>
  `<a class="profile__button" href="${appHref('library')}" data-router-link>${t('Browse Library')}</a>`;

/**
 * Reuse the same accessible panel layout for badges, history and settings.
 */
function panel(id: string, title: string, subtitle: string, icon: string, body: string): string {
  return `<section class="profile-panel" aria-labelledby="${id}">
    <div class="profile-panel__heading"><div><h2 id="${id}">${t(title)}</h2><p>${t(subtitle)}</p></div><span aria-hidden="true">${icon}</span></div>
    ${body}</section>`;
}
function checkbox(name: keyof ProfileSettings, title: string, isSelected: boolean): string {
  return `<label class="profile-settings__check"><input type="checkbox" name="${name}"${isSelected ? ' checked' : ''} />${t(title)}</label>`;
}

export class ProfilePage {
  private readonly header = new Header('profile');
  private readonly footer = new Footer();
  private readonly controller = new AbortController();

  constructor(
    private readonly profile: () => AuthProfile | undefined,
    private readonly progress: () => PlayerProgress | undefined,
    private readonly save: (settings: ProfileSettings) => void,
    private readonly reset: () => void,
  ) {}

  private renderStatistics(): string {
    const data = this.progress()?.data;
    if (!data) return '';
    const stats: [number, string][] = [
      [data.explored.length, 'Games explored'],
      [data.favorites.length, 'Saved favorites'],
      [data.comments, 'Comments posted'],
      [Object.keys(data.unlocked).length, 'Badges earned'],
    ];
    return stats
      .map(
        ([count, name]) =>
          `<div class="profile-stat"><dt>${t(name)}</dt><dd>${formatNumber(count)}</dd></div>`,
      )
      .join('');
  }

  private renderAchievements(): string {
    const data = this.progress()?.data;
    if (!data) return '';
    return ACHIEVEMENTS.map((badge) => {
      const unlockedAt = data.unlocked[badge.id];
      const current = unlockedAt ? badge.target : Math.min(badge.target, badge.progress(data));
      return `<li class="achievement${unlockedAt ? ' achievement--unlocked' : ''}">
        <span class="achievement__icon" aria-hidden="true">${badge.icon}</span>
        <div><h3>${t(badge.name)}</h3><p>${t(badge.description)}</p></div>
        <div class="achievement__progress"><span>${t(unlockedAt ? 'Unlocked' : 'Locked')} · ${formatNumber(current)}/${formatNumber(badge.target)}</span>
        <progress value="${current}" max="${badge.target}" aria-label="${t(badge.name)}"></progress>
        ${unlockedAt ? `<time datetime="${new Date(unlockedAt).toISOString()}">${formatDate(unlockedAt)}</time>` : ''}</div>
      </li>`;
    }).join('');
  }

  private renderHistory(): string {
    const history = this.progress()?.data.history ?? [];
    if (history.length === 0)
      return `<li class="profile__empty"><span aria-hidden="true">🧭</span><p>${t('No activity yet. Find your first favorite.')}</p>${libraryLink()}</li>`;
    return history
      .map(
        ({ kind, slug, name, at }) =>
          `<li class="profile-history__item"><span class="profile-history__symbol" aria-hidden="true">${ACTIVITY[kind].icon}</span>
        <div><span>${t(ACTIVITY[kind].label)}</span><a href="${appHref('library')}?game=${encodeURIComponent(slug)}" data-router-link>${escapeHtml(name)}</a></div>
        <time datetime="${new Date(at).toISOString()}">${formatDate(at)}</time></li>`,
      )
      .join('');
  }

  private renderSettings(settings: ProfileSettings): string {
    const avatars = Object.entries(AVATARS)
      .map(
        ([id, icon]) =>
          `<label class="avatar-choice"><input type="radio" name="avatar" value="${id}"${id === settings.avatar ? ' checked' : ''} /><span aria-hidden="true">${icon}</span><span class="visually-hidden">${t(labelCase(id))}</span></label>`,
      )
      .join('');
    const colors = AVATAR_COLORS.map(
      (color) =>
        `<label class="color-choice avatar--${color}"><input type="radio" name="color" value="${color}"${color === settings.color ? ' checked' : ''} /><span class="visually-hidden">${t(labelCase(color))}</span></label>`,
    ).join('');
    const form = `<form class="profile-settings" novalidate>
      <label for="profile-nickname">${t('Display name')}</label>
      <input id="profile-nickname" name="nickname" maxlength="30" value="${escapeHtml(settings.nickname)}" placeholder="${escapeHtml(this.profile()?.displayName ?? '')}" aria-describedby="nickname-hint profile-error" />
      <p class="profile__hint" id="nickname-hint">${t('You can leave your display name empty to use your account name.')}</p>
      <label for="profile-bio">${t('About you')}</label>
      <textarea id="profile-bio" name="bio" maxlength="160" rows="3" aria-describedby="profile-error">${escapeHtml(settings.bio)}</textarea>
      <fieldset><legend>${t('Choose an avatar')}</legend><div class="profile-settings__choices">${avatars}</div></fieldset>
      <fieldset><legend>${t('Avatar color')}</legend><div class="profile-settings__choices">${colors}</div></fieldset>
      ${checkbox('customAvatar', 'Use custom avatar in the header', settings.customAvatar)}
      ${checkbox('reducedMotion', 'Reduce animations', settings.reducedMotion)}
      ${checkbox('achievementNotifications', 'Achievement notifications', settings.achievementNotifications)}
      <p class="profile-settings__error" id="profile-error" role="alert"></p>
      <button class="profile__button" type="submit">${t('Save settings')}</button>
      <p class="profile__hint">${t('Changes apply to this browser profile.')}</p>
    </form>
    <details class="profile-reset"><summary>${t('Clear local progress')}</summary><p>${t('This removes local statistics, badges, history, and settings. Your account and server favorites stay intact.')}</p><button class="profile__button profile__button--quiet" type="button" data-profile-reset>${t('Clear progress')}</button></details>`;
    return panel('settings-title', 'Personal settings', 'Your profile, your style.', '✦', form);
  }

  private renderDashboard(profile: AuthProfile, progress: PlayerProgress): string {
    const settings = progress.data.settings;
    return `<section class="profile-hero" aria-labelledby="profile-title">
      <div class="profile-hero__copy"><p class="profile__eyebrow">${t('Player space')}</p><h1 id="profile-title">${t('A little play. A little progress.')}</h1><p>${t('Your next discovery starts here.')}</p>${libraryLink()}</div>
      <div class="profile-identity"><span class="profile-avatar avatar--${settings.color}" data-avatar-preview aria-hidden="true">${AVATARS[settings.avatar]}</span><strong data-profile-preview-name>${escapeHtml(settings.nickname || profile.displayName)}</strong><p data-profile-preview-bio>${escapeHtml(settings.bio)}</p><span class="profile-identity__tag">${t('My profile')}</span></div>
    </section>
    <p class="profile__scope">${t('Progress is saved for your account on this browser.')} ${t('Activity reflects games explored and confirmed community actions, starting with this extension.')}</p>
    <p class="profile__storage" role="status"${progress.isPersistent ? ' hidden' : ''}>${t('Browser storage is unavailable. Changes last only until you leave this page.')}</p>
    <dl class="profile-statistics" data-profile-statistics>${this.renderStatistics()}</dl>
    <div class="profile__columns"><div class="profile__main">
      ${panel('achievements-title', 'Achievements', 'Small steps, new milestones.', '🏆', `<ul class="achievements" data-profile-achievements>${this.renderAchievements()}</ul>`)}
      ${panel('history-title', 'Recent activity', 'Your latest 50 actions, newest first.', '↗', `<ol class="profile-history" data-profile-history>${this.renderHistory()}</ol>`)}
    </div><aside>${this.renderSettings(settings)}</aside></div>
    <dialog class="profile-confirm" aria-labelledby="reset-title"><h2 id="reset-title">${t('Clear this profile?')}</h2><p>${t('This removes local statistics, badges, history, and settings. Your account and server favorites stay intact.')}</p><form method="dialog"><button class="profile__button profile__button--quiet" value="cancel" autofocus>${t('Cancel')}</button><button class="profile__button" value="clear">${t('Clear progress')}</button></form></dialog>`;
  }

  public render(): string {
    const profile = this.profile();
    const progress = this.progress();
    const content =
      profile && progress
        ? this.renderDashboard(profile, progress)
        : `<section class="profile-guest"><span class="profile-guest__icon" aria-hidden="true">🎮</span><p class="profile__eyebrow">${t('Player space')}</p><h1>${t('Sign in to build your player profile.')}</h1><p>${t('Keep your discoveries, earn badges, and make this space yours.')}</p><button class="profile__button" type="button" data-auth-open="login">${t('Sign in')}</button>${libraryLink()}</section>`;
    return `${this.header.render()}<main class="profile">${content}</main>${this.footer.render()}`;
  }

  /**
   * Validation is shared by Save and live preview; preview tolerates incomplete text.
   */
  public readDraft(shouldValidate = true): ProfileSettings | undefined {
    const form = document.querySelector<HTMLFormElement>('.profile-settings');
    if (!form) return undefined;
    const text = (name: string): string =>
      (
        form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null
      )?.value.trim() ?? '';
    // Form controls are already grouped by name, so a dynamic CSS selector is unnecessary.
    const selectedValue = (name: 'avatar' | 'color'): string =>
      (form.elements.namedItem(name) as RadioNodeList | null)?.value ?? '';
    const isChecked = (
      name: 'customAvatar' | 'reducedMotion' | 'achievementNotifications',
    ): boolean => Boolean((form.elements.namedItem(name) as HTMLInputElement | null)?.checked);
    const draft = {
      nickname: text('nickname'),
      bio: text('bio'),
      avatar: selectedValue('avatar'),
      color: selectedValue('color'),
      customAvatar: isChecked('customAvatar'),
      reducedMotion: isChecked('reducedMotion'),
      achievementNotifications: isChecked('achievementNotifications'),
    };
    if (!isValidSettings({ ...draft, nickname: '', bio: '' })) return undefined;
    return !shouldValidate || isValidSettings(draft) ? (draft as ProfileSettings) : undefined;
  }

  public refresh(): void {
    const sections: [string, string][] = [
      ['[data-profile-statistics]', this.renderStatistics()],
      ['[data-profile-achievements]', this.renderAchievements()],
      ['[data-profile-history]', this.renderHistory()],
    ];
    for (const [selector, markup] of sections) {
      const element = document.querySelector(selector);
      if (element) element.innerHTML = markup;
    }
    const notice = document.querySelector<HTMLElement>('.profile__storage');
    if (notice) notice.hidden = Boolean(this.progress()?.isPersistent);
  }

  public bindEvents(): void {
    this.header.bindEvents();
    const form = document.querySelector<HTMLFormElement>('.profile-settings');
    const { signal } = this.controller;
    const preview = (): void => {
      const draft = this.readDraft(false);
      if (!draft) return;
      const avatar = document.querySelector<HTMLElement>('[data-avatar-preview]');
      const name = document.querySelector('[data-profile-preview-name]');
      const bio = document.querySelector('[data-profile-preview-bio]');
      if (avatar) {
        avatar.textContent = AVATARS[draft.avatar];
        avatar.className = `profile-avatar avatar--${draft.color}`;
      }
      if (name) name.textContent = draft.nickname || this.profile()?.displayName || '';
      if (bio) bio.textContent = draft.bio;
    };
    form?.addEventListener('input', preview, { signal });
    form?.addEventListener(
      'change',
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.matches('[name="avatar"], [name="color"]')
        ) {
          const custom = form.querySelector<HTMLInputElement>('[name="customAvatar"]');
          if (custom) custom.checked = true;
        }
        preview();
      },
      { signal },
    );
    form?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        const settings = this.readDraft();
        const error = form.querySelector<HTMLElement>('#profile-error');
        if (!settings) {
          if (error)
            error.textContent = t(
              'Use 2–30 characters for your display name and at most 160 for your bio.',
            );
          form.querySelector<HTMLInputElement>('[name="nickname"]')?.focus();
          return;
        }
        if (error) error.textContent = '';
        this.save(settings);
        this.refresh();
      },
      { signal },
    );

    const confirmation = document.querySelector<HTMLDialogElement>('.profile-confirm');
    document.querySelector('[data-profile-reset]')?.addEventListener(
      'click',
      () => {
        if (!confirmation) return;
        confirmation.returnValue = '';
        confirmation.showModal();
      },
      { signal },
    );
    confirmation?.addEventListener(
      'close',
      () => {
        if (confirmation.returnValue === 'clear') this.reset();
      },
      { signal },
    );
  }

  public destroy(): void {
    this.controller.abort();
    this.header.destroy();
    document.querySelector<HTMLDialogElement>('.profile-confirm[open]')?.close();
  }
}
