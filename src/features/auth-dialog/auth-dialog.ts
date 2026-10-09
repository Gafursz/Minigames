import googleIcon from './assets/google.svg';
import { renderAuthPanel } from './auth-form';
import type { AuthMode } from './auth-form';
import { AuthFormValidation } from './auth-form-validation';
import type { AuthValues } from './auth-validation';
import { getAuthErrorMessage } from '../../auth/auth-error';
import { snackbar } from '../../components/snackbar';

export class AuthDialog {
  private element: HTMLDialogElement | undefined;
  private controller: AbortController | undefined;
  private returnFocus: HTMLElement | undefined;
  private closeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private mode: AuthMode = 'login';
  private isClosing = false;
  private shouldRestoreFocus = true;
  private readonly formValidation = new Map<AuthMode, AuthFormValidation>();
  private isSubmitting = false;
  private requestVersion = 0;
  private readonly disabledControls = new Map<HTMLInputElement | HTMLButtonElement, boolean>();

  constructor(
    private readonly onOpenChange: (isOpen: boolean) => void,
    private readonly actions?: { close: () => void; setMode: (mode: AuthMode) => void },
    private readonly authenticate?: (mode: AuthMode, values: AuthValues) => Promise<void>,
    private readonly authenticateGoogle?: () => Promise<void>,
    private readonly onPendingChange?: (isPending: boolean) => void,
  ) {}

  private setPending(isPending: boolean): void {
    this.isSubmitting = isPending;
    if (!this.element) return;
    this.element.dataset.pending = String(isPending);
    if (isPending) {
      for (const control of this.element.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
        'input, button',
      )) {
        this.disabledControls.set(control, control.disabled);
        control.disabled = true;
      }
    } else {
      for (const [control, disabled] of this.disabledControls) control.disabled = disabled;
      this.disabledControls.clear();
    }
    for (const link of this.element.querySelectorAll('[data-auth-switch]')) {
      link.setAttribute('aria-disabled', String(isPending));
    }
    for (const validation of this.formValidation.values()) validation.setLocked(isPending);
    this.onPendingChange?.(isPending);
  }

  private async submit(event: Event): Promise<void> {
    event.preventDefault();
    const dialog = this.element;
    const validation = this.formValidation.get(this.mode);
    if (
      !dialog?.open ||
      this.isClosing ||
      this.isSubmitting ||
      event.target !== dialog.querySelector(`#auth-${this.mode}-panel form`) ||
      !validation?.validateSubmission()
    )
      return;
    const status = dialog.querySelector<HTMLElement>('.auth-dialog__status');
    if (!this.authenticate) {
      if (status) status.textContent = 'Account sign-in will be available in a later update.';
      return;
    }
    const values = validation.getValues();
    const mode = this.mode;
    const authenticate = this.authenticate;
    await this.runAuthentication(
      () => authenticate(mode, values),
      mode === 'login' ? 'Signing in…' : 'Creating account…',
      mode === 'login' ? 'You are signed in.' : 'Your account is ready. You are signed in.',
    );
  }

  private async runAuthentication(
    operation: () => Promise<void>,
    pendingMessage: string,
    successMessage: string,
  ): Promise<void> {
    if (!this.element?.open || this.isClosing || this.isSubmitting) return;
    const status = this.element.querySelector<HTMLElement>('.auth-dialog__status');
    const version = ++this.requestVersion;
    snackbar.dismiss();
    this.setPending(true);
    if (status) status.textContent = pendingMessage;
    try {
      await operation();
    } catch (error) {
      if (version !== this.requestVersion) return;
      this.setPending(false);
      const message = getAuthErrorMessage(error);
      if (status) status.textContent = message;
      snackbar.show(message, 'error');
      return;
    }
    if (version !== this.requestVersion) return;
    this.setPending(false);
    this.close(false);
    this.requestClose();
    snackbar.show(successMessage);
  }

  private requestMode(mode: AuthMode): void {
    if (this.isSubmitting) return;
    if (this.actions) this.actions.setMode(mode);
    else this.setMode(mode, true);
  }

  private requestClose(): void {
    if (this.isSubmitting) return;
    if (this.actions) this.actions.close();
    else this.close();
  }

  private setMode(mode: AuthMode, shouldFocusTab = false): void {
    if (!this.element || this.isClosing || this.isSubmitting) return;
    const isModeChanged = mode !== this.mode;
    this.mode = mode;
    this.element.dataset.mode = mode;
    this.element.setAttribute('aria-labelledby', `auth-${mode}-title`);
    for (const tab of this.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
      const isSelected = tab.dataset.authSwitch === mode;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected && shouldFocusTab) tab.focus({ preventScroll: true });
    }
    for (const panel of this.element.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
      panel.hidden = panel.id !== `auth-${mode}-panel`;
    }
    // Moving focus may blur the old field. Reset afterwards so that blur cannot restore an error.
    if (isModeChanged) this.resetForms();
    const status = this.element.querySelector<HTMLElement>('[role="status"]');
    if (status) status.textContent = '';
  }

  private resetForms(): void {
    if (!this.element) return;
    for (const validation of this.formValidation.values()) validation.reset();
    const password = this.element.querySelector<HTMLInputElement>('#auth-login-password');
    if (password) password.type = 'password';
    const visibility = this.element.querySelector('.auth-dialog__visibility');
    visibility?.setAttribute('aria-pressed', 'false');
    visibility?.setAttribute('aria-label', 'Show password');
  }

  private finishClose(shouldRestoreFocus = this.shouldRestoreFocus): void {
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.element?.close();
    this.element?.classList.remove('is-closing');
    this.isClosing = false;
    document.body.classList.remove('has-open-auth');
    this.onOpenChange(false);
    if (shouldRestoreFocus && this.returnFocus?.isConnected) {
      if (this.returnFocus.closest('[hidden]')) {
        const heading = document.querySelector<HTMLElement>('main h1');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      } else this.returnFocus.focus({ preventScroll: true });
    }
    this.resetForms();
    this.returnFocus = undefined;
  }

  private handleClick(event: MouseEvent): void {
    if (this.isSubmitting) {
      event.preventDefault();
      return;
    }
    if (!this.element || this.isClosing) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const switcher = target.closest<HTMLElement>('[data-auth-switch]');
    if (switcher) {
      event.preventDefault();
      this.requestMode(switcher.dataset.authSwitch === 'register' ? 'register' : 'login');
      return;
    }
    const visibility = target.closest<HTMLButtonElement>('.auth-dialog__visibility');
    if (visibility) {
      const password = this.element.querySelector<HTMLInputElement>('#auth-login-password');
      if (!password) return;
      const isVisible = password.type === 'password';
      password.type = isVisible ? 'text' : 'password';
      visibility.setAttribute('aria-pressed', String(isVisible));
      visibility.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
      return;
    }
    if (target.closest('[data-auth-google]')) {
      if (target.closest('[role="tabpanel"]')?.id !== `auth-${this.mode}-panel`) return;
      if (this.authenticateGoogle)
        void this.runAuthentication(
          this.authenticateGoogle,
          'Connecting to Google…',
          'You are signed in with Google.',
        );
      return;
    }
    const placeholder = target.closest<HTMLElement>('[data-auth-placeholder]');
    if (placeholder) {
      const status = this.element.querySelector<HTMLElement>('[role="status"]');
      if (status) status.textContent = placeholder.dataset.authPlaceholder ?? '';
      return;
    }
    if (target !== this.element) return;
    const bounds = this.element.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      this.requestClose();
  }

  public get isPending(): boolean {
    return this.isSubmitting;
  }

  public render(): string {
    return `
      <dialog class="auth-dialog" id="auth-dialog" aria-labelledby="auth-login-title" data-mode="login">
        <div class="auth-dialog__tabs" role="tablist" aria-label="Account access">
          <button class="auth-dialog__tab" id="auth-login-tab" type="button" role="tab" aria-selected="true" aria-controls="auth-login-panel" data-auth-switch="login">Login</button>
          <button class="auth-dialog__tab" id="auth-register-tab" type="button" role="tab" aria-selected="false" aria-controls="auth-register-panel" tabindex="-1" data-auth-switch="register">Register</button>
        </div>
        ${renderAuthPanel('login', googleIcon)}
        ${renderAuthPanel('register', googleIcon)}
        <p class="auth-dialog__status" role="status" aria-live="polite"></p>
      </dialog>
    `;
  }

  public bindEvents(): void {
    this.controller?.abort();
    for (const validation of this.formValidation.values()) validation.destroy();
    this.formValidation.clear();
    this.controller = new AbortController();
    const { signal } = this.controller;
    const dialog = document.querySelector<HTMLDialogElement>('#auth-dialog');
    if (!dialog) return;
    this.element = dialog;
    for (const mode of ['login', 'register'] as const) {
      const form = dialog.querySelector<HTMLFormElement>(`#auth-${mode}-panel form`);
      if (form) this.formValidation.set(mode, new AuthFormValidation(form, mode));
    }
    dialog.addEventListener('click', (event) => this.handleClick(event), { signal });
    dialog.addEventListener(
      'cancel',
      (event) => {
        event.preventDefault();
        this.requestClose();
      },
      { signal },
    );
    dialog.addEventListener(
      'animationend',
      (event) => {
        if (
          this.isClosing &&
          event.target === dialog &&
          event.animationName === 'auth-dialog-leave'
        )
          this.finishClose();
      },
      { signal },
    );
    dialog.addEventListener(
      'submit',
      (event) => {
        void this.submit(event);
      },
      { signal },
    );
    dialog.querySelector('[role="tablist"]')?.addEventListener(
      'keydown',
      (event) => {
        if (this.isSubmitting) {
          event.preventDefault();
          return;
        }
        if (
          !(event instanceof KeyboardEvent) ||
          !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        )
          return;
        event.preventDefault();
        let nextMode: AuthMode;
        if (event.key === 'Home') nextMode = 'login';
        else if (event.key === 'End') nextMode = 'register';
        else nextMode = this.mode === 'login' ? 'register' : 'login';
        this.requestMode(nextMode);
      },
      { signal },
    );
  }

  public open(mode: AuthMode, trigger?: HTMLElement): void {
    if (this.isSubmitting) return;
    if (!this.element || (document.querySelector('dialog[open]') && !this.element.open)) return;
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.isClosing = false;
    this.element.classList.remove('is-closing');
    if (!this.element.open) this.resetForms();
    this.setMode(mode, true);
    if (trigger) {
      this.returnFocus = trigger.closest('.header__mobile-menu')
        ? (document.querySelector<HTMLElement>('.header__burger') ?? trigger)
        : trigger;
    }
    if (this.element.open) return;
    this.element.showModal();
    this.element.scrollTop = 0;
    this.element
      .querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus({ preventScroll: true });
    document.body.classList.add('has-open-auth');
    this.onOpenChange(true);
  }

  public close(shouldAnimate = true, shouldRestoreFocus = true): void {
    if (!this.element?.open || this.isSubmitting) return;
    this.shouldRestoreFocus = shouldRestoreFocus;
    if (!shouldAnimate) {
      this.finishClose(shouldRestoreFocus);
      return;
    }
    if (this.isClosing) return;
    this.isClosing = true;
    this.element.classList.add('is-closing');
    const duration = getComputedStyle(this.element).animationDuration;
    const milliseconds = duration.endsWith('ms')
      ? Number(duration.slice(0, -2))
      : Number(duration.replace('s', '')) * 1000;
    this.closeTimer = globalThis.setTimeout(
      () => this.finishClose(),
      Number.isFinite(milliseconds) ? milliseconds : 0,
    );
  }

  public destroy(): void {
    this.requestVersion++;
    this.setPending(false);
    this.controller?.abort();
    this.finishClose(false);
    for (const validation of this.formValidation.values()) validation.destroy();
    this.formValidation.clear();
    this.element = undefined;
  }
}
