import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from './helpers.mjs';

function setup(context, hash = '#/library') {
  const app = createApp(hash);
  context.after(() => {
    assert.deepEqual(app.errors, []);
    app.close();
  });
  return app;
}

function dismiss(app) {
  app.query('#auth-dialog').dispatchEvent(new app.browser.Event('cancel', { cancelable: true }));
  app.tick(0);
}

test('desktop Login and Sign Up open the requested variant of one named dialog', (context) => {
  const app = setup(context);
  for (const [selector, mode] of [
    ['.header__login', 'login'],
    ['.header__signup', 'register'],
  ]) {
    app.click(selector);
    const dialog = app.query('#auth-dialog');
    assert.equal(dialog.open, true);
    assert.equal(dialog.dataset.mode, mode);
    assert.equal(dialog.getAttribute('aria-labelledby'), `auth-${mode}-title`);
    assert.equal(app.query(`#auth-${mode}-panel`).hidden, false);
    assert.equal(app.all('#auth-dialog [role="tabpanel"]:not([hidden])').length, 1);
    assert.equal(app.browser.document.body.classList.contains('has-open-auth'), true);
    dismiss(app);
    assert.equal(dialog.open, false);
    assert.equal(app.browser.document.activeElement, app.query(selector));
  }
});

test('mobile auth triggers close the menu and return focus to its visible burger button', (context) => {
  const app = setup(context);
  for (const selector of ['.header__mobile-login', '.header__mobile-signup']) {
    app.click('.header__burger');
    assert.equal(app.query('#mobile-navigation').hidden, false);
    app.click(selector);
    assert.equal(app.query('#mobile-navigation').hidden, true);
    assert.equal(app.query('.header__burger').getAttribute('aria-expanded'), 'false');
    assert.equal(app.query('#auth-dialog').open, true);
    dismiss(app);
    assert.equal(app.browser.document.activeElement, app.query('.header__burger'));
  }
});

test('tabs, arrow keys and inline links switch panels without navigation or losing drafts', (context) => {
  const app = setup(context);
  app.click('.header__login');
  app.query('#auth-login-email').value = 'gamer@example.com';
  app.click('#auth-login-panel [data-auth-switch="register"]');
  assert.equal(app.query('#auth-register-panel').hidden, false);
  assert.equal(app.browser.location.hash, '#/library');
  assert.equal(app.browser.document.activeElement.id, 'auth-register-tab');
  app
    .query('#auth-register-tab')
    .dispatchEvent(new app.browser.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  assert.equal(app.query('#auth-login-panel').hidden, false);
  assert.equal(app.query('#auth-login-email').value, 'gamer@example.com');
  app
    .query('#auth-login-tab')
    .dispatchEvent(new app.browser.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(app.query('#auth-register-tab').getAttribute('aria-selected'), 'true');
  assert.equal(app.query('#auth-login-tab').tabIndex, -1);
  app.click('#auth-register-panel [data-auth-switch="login"]');
  assert.equal(app.query('#auth-login-tab').tabIndex, 0);
  assert.equal(app.query('#auth-dialog').open, true);
});

test('both variants support animated Escape and backdrop dismissal but ignore content clicks', (context) => {
  const app = setup(context);
  for (const selector of ['.header__login', '.header__signup']) {
    app.click(selector);
    const dialog = app.query('#auth-dialog');
    dialog.style.animationDuration = '200ms';
    app.click(`#auth-${dialog.dataset.mode}-title`);
    assert.equal(dialog.open, true);
    dialog.dispatchEvent(new app.browser.MouseEvent('click', { clientX: -20, clientY: -20 }));
    assert.equal(dialog.open, true);
    assert.equal(dialog.classList.contains('is-closing'), true);
    app.tick(199);
    assert.equal(dialog.open, true);
    app.tick(1);
    assert.equal(dialog.open, false);
    assert.equal(app.browser.document.body.classList.contains('has-open-auth'), false);
    app.click(selector);
    dialog.dispatchEvent(new app.browser.Event('cancel', { cancelable: true }));
    app.tick(200);
    assert.equal(dialog.open, false);
  }
});

test('forms have associated labels, correct types and autocomplete; visibility resets on close', (context) => {
  const app = setup(context);
  app.click('.header__login');
  const inputs = app.all('#auth-dialog input');
  assert.equal(inputs.length, 6);
  for (const input of inputs) {
    assert.ok(app.query(`label[for="${input.id}"]`));
    assert.ok(input.autocomplete);
    assert.ok(input.name);
  }
  assert.equal(app.query('#auth-login-email').type, 'email');
  assert.equal(app.query('#auth-register-email').type, 'email');
  assert.equal(app.query('#auth-register-username').type, 'text');
  assert.equal(app.query('#auth-register-confirm-password').type, 'password');
  const password = app.query('#auth-login-password');
  password.value = 'temporary-password';
  app.click('.auth-dialog__visibility');
  assert.equal(password.type, 'text');
  assert.equal(app.query('.auth-dialog__visibility').getAttribute('aria-label'), 'Hide password');
  dismiss(app);
  assert.equal(password.type, 'password');
  assert.equal(password.value, '');
  app.click('.header__login');
  assert.equal(app.query('.auth-dialog__visibility').getAttribute('aria-pressed'), 'false');
});

test('submitting either form stays in the dialog without pretending to authenticate', (context) => {
  const app = setup(context);
  app.click('.header__login');
  for (const mode of ['login', 'register']) {
    app.click(`#auth-${mode}-tab`);
    const event = new app.browser.Event('submit', { cancelable: true, bubbles: true });
    app.query(`#auth-${mode}-panel form`).dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.match(app.query('.auth-dialog__status').textContent, /later update/);
    assert.equal(app.query('#auth-dialog').open, true);
    assert.equal(app.browser.location.hash, '#/library');
  }
});

test('auth pauses autoplay and navigation disposes the dialog and pending close timer', async (context) => {
  const app = setup(context, '#/');
  const current = () => app.query('.slider__item[data-slot="0"] .game-card__title').textContent;
  const first = current();
  app.tick(1000);
  app.click('.header__login');
  app.tick(12_000);
  assert.equal(current(), first);
  dismiss(app);
  app.tick(2999);
  assert.equal(current(), first);
  app.tick(1);
  assert.notEqual(current(), first);
  app.click('.header__signup');
  app.query('#auth-dialog').style.animationDuration = '200ms';
  app.query('#auth-dialog').dispatchEvent(new app.browser.Event('cancel', { cancelable: true }));
  await app.navigate(() => {
    app.browser.location.hash = '#/library';
  });
  app.tick(500);
  assert.equal(app.browser.document.body.classList.contains('has-open-auth'), false);
  assert.equal(app.query('#auth-dialog').open, false);
  assert.equal(app.timers.size, 0);
});
