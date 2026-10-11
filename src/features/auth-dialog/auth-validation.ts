import type { AuthMode } from './auth-form';

export type AuthFieldName = 'email' | 'username' | 'password' | 'confirm-password';
export type AuthValues = Record<AuthFieldName, string>;
export type AuthErrors = Record<AuthFieldName, string>;

export const AUTH_RULES = {
  usernameMinLength: 2,
  usernameMaxLength: 30,
  passwordMinLength: 6,
} as const;

// Common unquoted email addresses, including aliases and subdomains.
const EMAIL_LOCAL = /^[\dA-Za-z!#$%&'*+/=?^_`{|}~-]+(?:\.[\dA-Za-z!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_DOMAIN =
  /^(?:[\dA-Za-z](?:[\dA-Za-z-]*[\dA-Za-z])?\.)+[\dA-Za-z](?:[\dA-Za-z-]*[\dA-Za-z])?$/;

function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  const parts = email.split('@');
  return parts.length !== 2 || !EMAIL_LOCAL.test(parts[0]) || !EMAIL_DOMAIN.test(parts[1])
    ? 'Enter a valid email address, such as alex@example.com.'
    : '';
}

function validateUsername(value: string): string {
  if (!value) return 'Enter a username.';
  if (value.length < AUTH_RULES.usernameMinLength || value.length > AUTH_RULES.usernameMaxLength) {
    return 'Use 2–30 characters for your username.';
  }
  if (!/^[A-Z]/.test(value)) return 'Start your username with an uppercase English letter.';
  return /^[\dA-Za-z]+$/.test(value) ? '' : 'Use English letters and digits only.';
}

function validatePassword(value: string, mode: AuthMode): string {
  if (!value) return 'Enter your password.';
  if (value.length < AUTH_RULES.passwordMinLength) return 'Use at least 6 characters.';
  if (mode === 'login') return '';
  // Visible ASCII punctuation counts as special; spaces and non-English letters do not.
  if (!/^[!-~]+$/.test(value)) return 'Use English letters, digits, and symbols without spaces.';
  if (!/[A-Z]/.test(value)) return 'Include an uppercase English letter.';
  if (!/\d/.test(value)) return 'Include a digit.';
  return /[^\dA-Za-z]/.test(value) ? '' : 'Include a special character, such as ! or @.';
}

export function validateAuthForm(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {
    email: validateEmail(values.email),
    username: '',
    password: validatePassword(values.password, mode),
    'confirm-password': '',
  };
  if (mode === 'register') {
    errors.username = validateUsername(values.username);
    if (!values['confirm-password']) errors['confirm-password'] = 'Confirm your password.';
    else if (values['confirm-password'] !== values.password) {
      errors['confirm-password'] = 'Passwords must match exactly.';
    }
  }
  return errors;
}
