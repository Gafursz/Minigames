import googleIcon from './assets/google.svg';
import { renderAuthPanel } from './auth-form';
import type { AuthMode } from './auth-form';
import { AuthFormValidation } from './auth-form-validation';

export class AuthDialog {
  private element: HTMLDialogElement | undefined;
  private controller: AbortController | undefined;
  private returnFocus: HTMLElement | undefined;
  private closeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private mode: AuthMode = 'login';
  private isClosing = false;
  private shouldRestoreFocus = true;
  private readonly formValidation = new Map<AuthMode, AuthFormValidation>();

  constructor(
    private readonly onOpenChange: (isOpen: boolean) => void,
    private readonly actions?: { close: () => void; setMode: (mode: AuthMode) => void },
  ) {}

  private requestMode(mode: AuthMode): void {
    if (this.actions) this.actions.setMode(mode);
    else this.setMode(mode, true);
  }

  private requestClose(): void {
    if (this.actions) this.actions.close();
    else this.close();
  }

  private setMode(mode: AuthMode, shouldFocusTab = false): void {
    if (!this.element || this.isClosing) return;
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
      this.returnFocus.focus({ preventScroll: true });
    }
    this.resetForms();
    this.returnFocus = undefined;
  }

  private handleClick(event: MouseEvent): void {
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
        event.preventDefault();
        const activeForm = dialog.querySelector(`#auth-${this.mode}-panel form`);
        if (
          this.isClosing ||
          !dialog.open ||
          event.target !== activeForm ||
          !this.formValidation.get(this.mode)?.validateSubmission()
        )
          return;
        const status = dialog.querySelector<HTMLElement>('[role="status"]');
        if (status) status.textContent = 'Account sign-in will be available in a later update.';
      },
      { signal },
    );
    dialog.querySelector('[role="tablist"]')?.addEventListener(
      'keydown',
      (event) => {
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
    if (!this.element?.open) return;
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
    this.controller?.abort();
    this.finishClose(false);
    for (const validation of this.formValidation.values()) validation.destroy();
    this.formValidation.clear();
    this.element = undefined;
  }
}
