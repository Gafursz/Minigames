export type AuthMode = 'login' | 'register';

type Field = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password';
  icon: 'person' | 'mail' | 'lock';
  placeholder: string;
  autocomplete: string;
};

const loginFields: Field[] = [
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    icon: 'mail',
    placeholder: 'e.g. alex@minigames.com',
    autocomplete: 'username',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    icon: 'lock',
    placeholder: '••••••••',
    autocomplete: 'current-password',
  },
];

const registerFields: Field[] = [
  {
    name: 'username',
    label: 'Username',
    type: 'text',
    icon: 'person',
    placeholder: 'e.g. CozyGamer_99',
    autocomplete: 'username',
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    icon: 'mail',
    placeholder: 'your.email@domain.com',
    autocomplete: 'email',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    icon: 'lock',
    placeholder: 'Min. 8 characters',
    autocomplete: 'new-password',
  },
  {
    name: 'confirm-password',
    label: 'Confirm Password',
    type: 'password',
    icon: 'lock',
    placeholder: 'Repeat your password',
    autocomplete: 'new-password',
  },
];

function renderField(field: Field, mode: AuthMode): string {
  const id = `auth-${mode}-${field.name}`;
  const hasVisibilityToggle = mode === 'login' && field.type === 'password';
  return `
    <div class="auth-dialog__field">
      <label class="auth-dialog__label" for="${id}">${field.label}</label>
      <div class="auth-dialog__control">
        <span class="auth-dialog__symbol" aria-hidden="true">${field.icon}</span>
        <input class="auth-dialog__input" id="${id}" name="${field.name}" type="${field.type}"
          placeholder="${field.placeholder}" autocomplete="${field.autocomplete}" required />
        ${hasVisibilityToggle ? `<button class="auth-dialog__visibility" type="button" aria-label="Show password" aria-pressed="false" aria-controls="${id}"><span class="auth-dialog__symbol" aria-hidden="true">visibility</span></button>` : ''}
      </div>
    </div>
  `;
}

export function renderAuthPanel(mode: AuthMode, googleIcon: string): string {
  const isLogin = mode === 'login';
  const fields = isLogin ? loginFields : registerFields;
  return `
    <section class="auth-dialog__panel" id="auth-${mode}-panel" role="tabpanel"
      aria-labelledby="auth-${mode}-tab" ${isLogin ? '' : 'hidden'}>
      <header class="auth-dialog__heading">
        <h2 class="auth-dialog__title" id="auth-${mode}-title">${isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
        <p class="auth-dialog__description">${isLogin ? 'Sign in to resume your games and progress.' : 'Join MiniGames to track your score &amp; streak.'}</p>
      </header>
      <form class="auth-dialog__form" aria-labelledby="auth-${mode}-title" novalidate>
        <div class="auth-dialog__fields">
          ${fields.map((field) => renderField(field, mode)).join('')}
          ${isLogin ? '<div class="auth-dialog__forgot"><button class="auth-dialog__link" type="button" data-auth-placeholder="Password recovery will be available in a later update.">Forgot Password?</button></div>' : ''}
        </div>
        <div class="auth-dialog__actions">
          <button class="auth-dialog__submit" type="submit">${isLogin ? 'Login' : 'Create Account'}</button>
          <div class="auth-dialog__divider" aria-hidden="true"><span>OR</span></div>
          <button class="auth-dialog__google" type="button" data-auth-placeholder="Google sign-in will be available in a later update.">
            <span class="auth-dialog__google-icon"><img src="${googleIcon}" alt="" /></span>
            <span>${isLogin ? 'Continue with Google' : 'Sign up with Google'}</span>
          </button>
        </div>
      </form>
      <p class="auth-dialog__footer">
        ${isLogin ? "Don't have an account?" : 'Already have an account?'}
        <a class="auth-dialog__link" href="#auth-${isLogin ? 'register' : 'login'}-panel" data-auth-switch="${isLogin ? 'register' : 'login'}">${isLogin ? 'Register' : 'Login'}</a>
      </p>
    </section>
  `;
}
