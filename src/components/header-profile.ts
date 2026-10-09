import type { AuthProfile } from '../auth/email-auth';

export function getProfileName(profile: AuthProfile): string {
  return profile.displayName.trim() || profile.email.split('@', 1)[0]?.trim() || 'Player';
}

export function getProfileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';

  const first = words[0]?.match(/[\p{L}\p{N}]/u)?.[0] ?? '';

  if (words.length === 1) {
    return first.toLocaleUpperCase() || '?';
  }

  const last = words.at(-1)?.match(/[\p{L}\p{N}]/u)?.[0] ?? '';

  return (first + last).toLocaleUpperCase() || '?';
}

export function renderHeaderProfile(): string {
  return `<div class="header__profile" data-header-profile hidden>
    <span class="header__profile-name" data-profile-name></span>
    <span class="header__avatar">
      <span data-profile-initials aria-hidden="true"></span>
      <img data-profile-photo alt="" hidden />
    </span>
    <button class="header__logout" type="button" data-auth-logout>Log out</button>
  </div>`;
}

export function updateHeaderProfile(root: HTMLElement, profile: AuthProfile | undefined): void {
  for (const control of root.querySelectorAll<HTMLElement>(':scope .header [data-auth-open]'))
    control.hidden = Boolean(profile);
  for (const element of root.querySelectorAll<HTMLElement>('[data-header-profile]')) {
    element.hidden = !profile;
    const name = element.querySelector<HTMLElement>('[data-profile-name]');
    const initials = element.querySelector<HTMLElement>('[data-profile-initials]');
    const photo = element.querySelector<HTMLImageElement>('[data-profile-photo]');
    if (!name || !initials || !photo) continue;
    name.textContent = profile ? getProfileName(profile) : '';
    initials.textContent = profile ? getProfileInitials(name.textContent) : '';
    initials.hidden = false;
    photo.hidden = true;
    photo.removeAttribute('src');
  }
}
