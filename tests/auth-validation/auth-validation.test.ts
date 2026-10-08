import { expect, test } from 'vitest';
import { validateAuthForm } from '../../src/features/auth-dialog/auth-validation';
import type { AuthValues } from '../../src/features/auth-dialog/auth-validation';

const valid: AuthValues = {
  email: 'alex@example.com',
  username: 'CozyGamer99',
  password: 'Abcd1!',
  'confirm-password': 'Abcd1!',
};

test.each(['login', 'register'] as const)('%s requires an email address', (mode) => {
  for (const email of ['', ' '.repeat(3)]) {
    expect(validateAuthForm(mode, { ...valid, email }).email).toBe('Enter your email address.');
  }
});

test.each([
  'alex',
  'alex@',
  '@example.com',
  'alex@example',
  'a b@example.com',
  'a@@example.com',
  '.alex@example.com',
  'alex..bob@example.com',
  'alex@-example.com',
  'alex@example..com',
])('rejects malformed email %s in both forms', (email) => {
  for (const mode of ['login', 'register'] as const) {
    expect(validateAuthForm(mode, { ...valid, email }).email).toContain('valid email');
  }
});

test.each(['Alex+games@sub.example.co.uk', 'first.last@example.com', ' alex@example.com '])(
  'accepts common email formats: %s',
  (email) => {
    expect(validateAuthForm('register', { ...valid, email }).email).toBe('');
  },
);

test.each([
  ['', 'Enter a username.'],
  ['A', 'Use 2–30 characters'],
  [`A${'b'.repeat(30)}`, 'Use 2–30 characters'],
  ['alex', 'uppercase English letter'],
  ['1Alex', 'uppercase English letter'],
  ['Аlex', 'uppercase English letter'],
  ['CozyGamer_99', 'English letters and digits only'],
  ['Alex Smith', 'English letters and digits only'],
  ['Aléx', 'English letters and digits only'],
])('rejects invalid username %s', (username, message) => {
  expect(validateAuthForm('register', { ...valid, username }).username).toContain(message);
});

test.each(['A1', 'Ab', `A${'b'.repeat(29)}`, 'CozyGamer99'])(
  'accepts valid username boundaries: %s',
  (username) => {
    expect(validateAuthForm('register', { ...valid, username }).username).toBe('');
  },
);

test.each([
  ['', 'Enter your password.'],
  ['Ab1!x', 'at least 6'],
  ['abc12!', 'uppercase'],
  ['Abcde!', 'digit'],
  ['Abcd12', 'special character'],
  ['Abc1! ', 'without spaces'],
  ['Abc1!é', 'English letters'],
  ['Abc1!\n', 'without spaces'],
])('enforces registration password rules: %j', (password, message) => {
  expect(validateAuthForm('register', { ...valid, password }).password).toContain(message);
});

test.each(['Abcd1!', 'ABC12_', 'A1234~', `A1!${'a'.repeat(80)}`])(
  'accepts registration password %s',
  (password) => {
    expect(validateAuthForm('register', { ...valid, password }).password).toBe('');
  },
);

test('login requires six characters without registration strength restrictions', () => {
  expect(validateAuthForm('login', { ...valid, password: '' }).password).toBe(
    'Enter your password.',
  );
  expect(validateAuthForm('login', { ...valid, password: '12345' }).password).toContain(
    'at least 6',
  );
  for (const password of ['abcdef', '123456', 'éééééé', 'Abc 12']) {
    const errors = validateAuthForm('login', {
      ...valid,
      password,
      username: '',
      'confirm-password': '',
    });
    expect(Object.values(errors)).toEqual(['', '', '', '']);
  }
});

test('confirmation is required and must match exactly without its own strength check', () => {
  expect(
    validateAuthForm('register', { ...valid, 'confirm-password': '' })['confirm-password'],
  ).toBe('Confirm your password.');
  for (const confirmation of ['abcd1!', 'Abcd1! ', 'Abcd2!']) {
    expect(
      validateAuthForm('register', { ...valid, 'confirm-password': confirmation })[
        'confirm-password'
      ],
    ).toBe('Passwords must match exactly.');
  }
  const errors = validateAuthForm('register', { ...valid, password: 'x', 'confirm-password': 'x' });
  expect(errors.password).toContain('at least 6');
  expect(errors['confirm-password']).toBe('');
});

test('validation does not mutate or silently trim credentials', () => {
  const values = { ...valid, password: 'Abcd1! ', 'confirm-password': 'Abcd1!' };
  const original = { ...values };
  const errors = validateAuthForm('register', values);
  expect(errors.password).toContain('without spaces');
  expect(errors['confirm-password']).toContain('match exactly');
  expect(values).toEqual(original);
});
