import { getGameDetails, toggleFavorite } from '../../api/minigames-api';
import type { FavoriteState } from '../../api/minigames-api';
import type { AuthProfile } from '../../auth/email-auth';
import { snackbar } from '../../components/snackbar';
import { formatLikesCount } from '../../utils/game';
import { readGameDetails } from './game-data';
import favoriteIcon from '../../assets/icons/favorite-heart.svg';
import favoriteActiveIcon from '../../assets/icons/favorite-heart-active.svg';

export class FavoriteControl {
  private profile: AuthProfile | undefined;
  private dialog: HTMLDialogElement | undefined;
  private slug: string | undefined;
  private controller: AbortController | undefined;
  private request: AbortController | undefined;
  private state: FavoriteState = { isFavorited: false, likesCount: 0 };
  private isReady = false;

  constructor(private readonly requireSession?: () => AuthProfile | undefined) {}

  private paint(): void {
    const button = this.dialog?.querySelector<HTMLButtonElement>('.game-details__favorite');
    if (!button) return;
    const isPending = Boolean(this.request);
    let label = this.state.isFavorited ? 'Remove from Favorites' : 'Add to Favorites';
    if (this.profile && !this.isReady) label = 'Retry favorite status';
    if (isPending) label = 'Loading…';
    button.disabled = isPending || !this.requireSession;
    button.setAttribute('aria-busy', String(isPending));
    button.setAttribute('aria-pressed', String(this.state.isFavorited));
    button.setAttribute('aria-label', label);
    button.title = this.profile ? label : 'Sign in to add favorites';
    const text = button.querySelector('.game-details__favorite-label');
    if (text) text.textContent = label;
    const icon = button.querySelector('img');
    if (icon) icon.src = this.state.isFavorited ? favoriteActiveIcon : favoriteIcon;
    const count = this.dialog?.querySelector('[data-game-likes-count]');
    if (count) count.textContent = formatLikesCount(this.state.likesCount);
  }

  private async run(shouldToggle: boolean): Promise<void> {
    if (this.request || !this.slug || !this.profile) return;
    const slug = this.slug;
    const email = this.profile.email;
    const request = new AbortController();
    this.request = request;
    this.paint();
    const isCurrent = (): boolean =>
      this.request === request && !request.signal.aborted && this.profile?.email === email;
    try {
      let state: FavoriteState;
      if (shouldToggle) state = await toggleFavorite(slug, email, request.signal);
      else {
        const response = await getGameDetails(slug, request.signal, email);
        const game = readGameDetails(response, slug);
        if (!game) throw new TypeError('Game favorite status is unavailable.');
        state = { isFavorited: game.isLikedByCurrentUser, likesCount: game.likesCount };
      }
      if (!isCurrent()) return;
      this.state = state;
      this.isReady = true;
      if (shouldToggle)
        snackbar.show(
          state.isFavorited ? 'Added to Favorites.' : 'Removed from Favorites.',
          'success',
        );
    } catch {
      if (!isCurrent()) return;
      // A failed POST may have reached the server. Reconcile with GET on explicit retry.
      this.isReady = false;
      snackbar.show(
        shouldToggle
          ? 'Favorite update could not be confirmed. Retry favorite status before trying again.'
          : 'Favorite status could not be loaded. Use Retry favorite status.',
        'error',
      );
    } finally {
      if (isCurrent()) {
        this.request = undefined;
        this.paint();
      }
    }
  }

  public setProfile(profile: AuthProfile | undefined): void {
    const isChanged = this.profile?.email !== profile?.email;
    this.profile = profile;
    if (!isChanged) return;
    this.request?.abort();
    this.request = undefined;
    this.state = { ...this.state, isFavorited: false };
    this.isReady = !profile;
    this.paint();
    if (profile) void this.run(false);
  }

  public bind(
    dialog: HTMLDialogElement,
    slug: string,
    state: FavoriteState,
    requestedEmail?: string,
  ): void {
    this.destroy();
    this.dialog = dialog;
    this.slug = slug;
    this.state = { ...state, isFavorited: Boolean(this.profile) && state.isFavorited };
    this.isReady = requestedEmail === this.profile?.email;
    this.controller = new AbortController();
    dialog.querySelector('.game-details__favorite')?.addEventListener(
      'click',
      () => {
        if (this.request) return;
        const profile = this.requireSession?.();
        if (!profile) {
          snackbar.show('Please sign in to use Favorites.', 'error');
          return;
        }
        if (this.profile?.email !== profile.email) {
          this.setProfile(profile);
          return;
        }
        void this.run(this.isReady);
      },
      { signal: this.controller.signal },
    );
    this.paint();
    if (!this.isReady && this.profile) void this.run(false);
  }

  public destroy(): void {
    this.controller?.abort();
    this.request?.abort();
    this.controller = undefined;
    this.request = undefined;
    this.dialog = undefined;
    this.slug = undefined;
  }
}
