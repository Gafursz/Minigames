import type { AuthMode } from './auth-form';
import { validateAuthForm } from './auth-validation';
import type { AuthFieldName, AuthValues } from './auth-validation';

type FormField = {
  name: AuthFieldName;
  input: HTMLInputElement;
  error: HTMLElement;
};

export class AuthFormValidation {
  private readonly controller = new AbortController();
  private readonly touched = new Set<AuthFieldName>();
  private readonly fields: FormField[];

  constructor(
    private readonly form: HTMLFormElement,
    private readonly mode: AuthMode,
  ) {
    const names: AuthFieldName[] =
      mode === 'login'
        ? ['email', 'password']
        : ['username', 'email', 'password', 'confirm-password'];
    this.fields = names.map((name) => {
      const input = form.querySelector<HTMLInputElement>(`#auth-${mode}-${name}`);
      const error = form.querySelector<HTMLElement>(`#auth-${mode}-${name}-error`);
      if (!input || !error) throw new Error(`Missing auth field markup: ${mode}/${name}`);
      return { name, input, error };
    });
    for (const eventName of ['input', 'change', 'blur']) {
      form.addEventListener(eventName, (event) => this.handleEdit(event), {
        signal: this.controller.signal,
        capture: eventName === 'blur',
      });
    }
    this.refresh();
  }

  private handleEdit(event: Event): void {
    const field = this.fields.find(({ input }) => input === event.target);
    if (!field) return;
    this.touched.add(field.name);
    if (field.name === 'password' && this.mode === 'register') {
      const confirmation = this.fields.find(({ name }) => name === 'confirm-password');
      // Recompute every field below; show a confirmation error once it has a value or was visited.
      if (confirmation?.input.value) this.touched.add('confirm-password');
    }
    this.refresh();
  }

  private refresh(): FormField | undefined {
    const values: AuthValues = { username: '', email: '', password: '', 'confirm-password': '' };
    for (const { name, input } of this.fields) values[name] = input.value;
    const errors = validateAuthForm(this.mode, values);
    for (const { name, input, error } of this.fields) {
      const message = this.touched.has(name) ? errors[name] : '';
      error.textContent = message;
      input.setAttribute('aria-invalid', String(Boolean(message)));
    }
    const firstInvalid = this.fields.find(({ name }) => errors[name].length > 0);
    const submit = this.form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (submit) submit.disabled = Boolean(firstInvalid);
    return firstInvalid;
  }

  public validateSubmission(): boolean {
    for (const { name } of this.fields) this.touched.add(name);
    const firstInvalid = this.refresh();
    firstInvalid?.input.focus();
    return !firstInvalid;
  }

  public reset(): void {
    this.form.reset();
    this.touched.clear();
    this.refresh();
  }

  public destroy(): void {
    this.controller.abort();
  }
}
