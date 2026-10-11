import { expect, test, vi } from 'vitest';
import { createBrowserDom } from '../helpers/browser-dom.mjs';
import { AuthDialog } from '../../src/features/auth-dialog/auth-dialog';

function setup(context, mode = 'login') {
  const window = createBrowserDom(context);
  vi.stubGlobal('KeyboardEvent', window.KeyboardEvent);
  const dialog = new AuthDialog(vi.fn());
  window.document.body.innerHTML = `<button id="trigger">Account</button>${dialog.render()}`;
  dialog.bindEvents();
  context.onTestFinished(() => dialog.destroy());
  dialog.open(mode, window.document.querySelector('#trigger'));
  const { document } = window;
  const element = document.querySelector('#auth-dialog');
  const field = (name, formMode = mode) => document.querySelector(`#auth-${formMode}-${name}`);
  const form = (formMode = mode) => document.querySelector(`#auth-${formMode}-panel form`);
  const submit = (formMode = mode) => form(formMode).querySelector('[type="submit"]');
  const error = (name, formMode = mode) =>
    document.querySelector(`#auth-${formMode}-${name}-error`);
  const edit = (name, value, eventName = 'input', formMode = mode) => {
    const input = field(name, formMode);
    input.value = value;
    input.dispatchEvent(new window.Event(eventName, { bubbles: eventName !== 'blur' }));
  };
  const fillValid = (formMode = mode) => {
    const entries =
      formMode === 'login'
        ? { email: 'alex@example.com', password: 'abcdef' }
        : {
            username: 'Alex99',
            email: 'alex@example.com',
            password: 'Abcd1!',
            'confirm-password': 'Abcd1!',
          };
    for (const [name, value] of Object.entries(entries)) edit(name, value, 'input', formMode);
  };
  const status = document.querySelector('.auth-dialog__status');
  return { dialog, document, window, element, field, form, submit, error, edit, fillValid, status };
}

test('fresh forms have no announced errors, linked descriptions, and disabled submit buttons', (context) => {
  const { document, submit } = setup(context);
  expect(submit('login').disabled).toBe(true);
  expect(submit('register').disabled).toBe(true);
  for (const input of document.querySelectorAll('.auth-dialog__input')) {
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    const error = document.querySelector(`#${input.id}-error`);
    expect(error.textContent).toBe('');
    expect(error.getAttribute('aria-live')).toBe('polite');
    for (const id of input.getAttribute('aria-describedby').split(' ')) {
      expect(document.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(input.labels.length).toBe(1);
  }
  expect(document.querySelector('#auth-register-username').placeholder).toBe('e.g. CozyGamer99');
  expect(document.querySelector('#auth-register-password').minLength).toBe(6);
  expect(document.querySelector('#auth-register-password').placeholder).toContain('6');
  expect(document.querySelector('#auth-login-email').type).toBe('email');
  expect(document.querySelector('#auth-register-confirm-password').type).toBe('password');
});

for (const eventName of ['input', 'change', 'blur']) {
  test(`${eventName} validates inline, clears corrections, and keeps input focus`, (context) => {
    const { document, field, edit, error, submit } = setup(context);
    field('email').focus();
    edit('email', 'broken', eventName);
    expect(error('email').textContent).toContain('valid email');
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field('email'));
    expect(error('password').textContent).toBe('');
    expect(submit().disabled).toBe(true);
    edit('email', 'alex@example.com', eventName);
    expect(error('email').textContent).toBe('');
    expect(field('email').getAttribute('aria-invalid')).toBe('false');
    edit('password', 'abcdef', eventName);
    expect(submit().disabled).toBe(false);
    edit('email', '', eventName);
    expect(error('email').textContent).toBe('Enter your email address.');
    expect(submit().disabled).toBe(true);
  });
}

test('a real focus move validates an untouched empty required field on blur', (context) => {
  const { field, error } = setup(context);
  field('email').focus();
  field('password').focus();
  expect(error('email').textContent).toBe('Enter your email address.');
});

test('registration submission requires every field; password edits immediately revalidate confirmation', (context) => {
  const { edit, error, field, submit, fillValid } = setup(context, 'register');
  fillValid();
  expect(submit().disabled).toBe(false);
  edit('password', 'Other2!');
  expect(error('confirm-password').textContent).toBe('Passwords must match exactly.');
  expect(field('confirm-password').getAttribute('aria-invalid')).toBe('true');
  expect(submit().disabled).toBe(true);
  edit('confirm-password', 'Other2!', 'change');
  expect(error('confirm-password').textContent).toBe('');
  expect(submit().disabled).toBe(false);
  edit('password', 'x');
  edit('confirm-password', 'x');
  expect(error('confirm-password').textContent).toBe('');
  expect(error('password').textContent).toContain('at least 6');
  expect(submit().disabled).toBe(true);
  edit('password', 'Other2!');
  edit('confirm-password', 'Other2!');
  edit('username', 'Alex_99');
  expect(error('username').textContent).toContain('English letters and digits only');
  expect(submit().disabled).toBe(true);
  edit('username', 'Alex99');
  expect(submit().disabled).toBe(false);
});

test('an empty confirmation stays pristine until visited, then revalidates on password changes', (context) => {
  const { edit, error, submit } = setup(context, 'register');
  edit('password', 'Abcd1!');
  expect(error('confirm-password').textContent).toBe('');
  expect(submit().disabled).toBe(true);
  edit('confirm-password', '', 'blur');
  expect(error('confirm-password').textContent).toBe('Confirm your password.');
  edit('password', 'Other2!');
  expect(error('confirm-password').textContent).toBe('Confirm your password.');
});

for (const mode of ['login', 'register']) {
  test(`invalid ${mode} submit cannot bypass validation; valid submit does not fake authentication`, (context) => {
    const { window, form, field, submit, status, document, fillValid, element } = setup(
      context,
      mode,
    );
    const attempt = new window.Event('submit', { bubbles: true, cancelable: true });
    form().dispatchEvent(attempt);
    expect(attempt.defaultPrevented).toBe(true);
    expect(submit().disabled).toBe(true);
    expect(document.activeElement).toBe(field(mode === 'login' ? 'email' : 'username'));
    expect(status.textContent).toBe('');
    fillValid();
    expect(submit().disabled).toBe(false);
    form().dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    expect(status.textContent).toBe('Account sign-in will be available in a later update.');
    expect(element.open).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });
}

test('a disabled submit does nothing and programmatic value changes are rechecked on submission', (context) => {
  const { submit, status, field, form, window, error, fillValid } = setup(context);
  submit().click();
  expect(status.textContent).toBe('');
  expect(error('email').textContent).toBe('');
  fillValid();
  field('password').value = 'short';
  form().dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  expect(submit().disabled).toBe(true);
  expect(error('password').textContent).toContain('at least 6');
  expect(status.textContent).toBe('');
});

test('mode switches clear both forms, errors, password visibility, and submit state', (context) => {
  const { document, field, edit, error, submit, fillValid, element } = setup(context);
  edit('email', 'bad');
  edit('password', 'secret');
  document.querySelector('.auth-dialog__visibility').click();
  expect(field('password').type).toBe('text');
  document.querySelector('#auth-register-tab').click();
  expect(field('email').value).toBe('');
  expect(field('password').value).toBe('');
  expect(field('password').type).toBe('password');
  expect(error('email').textContent).toBe('');
  expect(field('email').getAttribute('aria-invalid')).toBe('false');
  expect(submit().disabled).toBe(true);
  expect(submit('register').disabled).toBe(true);
  fillValid('register');
  document.querySelector('#auth-register-panel [data-auth-switch="login"]').click();
  expect(field('username', 'register').value).toBe('');
  expect(field('password', 'register').value).toBe('');
  expect(field('confirm-password', 'register').value).toBe('');
  expect(submit('register').disabled).toBe(true);
  expect(element.open).toBe(true);
  expect(document.activeElement).toBe(document.querySelector('#auth-login-tab'));
});

test('selecting the current mode preserves values and validation errors', (context) => {
  const { document, field, edit, error, submit } = setup(context);
  edit('email', 'bad');
  edit('password', 'abcdef');
  document.querySelector('#auth-login-tab').click();
  expect(field('email').value).toBe('bad');
  expect(field('password').value).toBe('abcdef');
  expect(error('email').textContent).toContain('valid email');
  expect(submit().disabled).toBe(true);
});

test('closing and reopening resets errors and values and restores the trigger focus', (context) => {
  const { dialog, edit, document, field, error, submit } = setup(context);
  edit('email', 'bad');
  field('email').focus();
  dialog.close(false);
  expect(document.activeElement).toBe(document.querySelector('#trigger'));
  expect(error('email').textContent).toBe('');
  dialog.open('login');
  expect(field('email').value).toBe('');
  expect(error('email').textContent).toBe('');
  expect(submit().disabled).toBe(true);
});

test('hidden and closing forms cannot submit, and destroy removes validation listeners', (context) => {
  const { dialog, form, window, fillValid, status, field, edit, error } = setup(context);
  fillValid('register');
  form('register').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  expect(status.textContent).toBe('');
  fillValid();
  dialog.close();
  form().dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  expect(status.textContent).toBe('');
  dialog.destroy();
  edit('email', 'bad');
  expect(error('email').textContent).toBe('');
  expect(field('email').getAttribute('aria-invalid')).toBe('false');
});
