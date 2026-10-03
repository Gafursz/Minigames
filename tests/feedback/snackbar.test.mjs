import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Snackbar, SNACKBAR_DURATION } from '../../src/components/snackbar.ts';
import { createDom } from './dom.mjs';

function setup(context, markup = '<button id="trigger">Load games</button>') {
  const snackbar = new Snackbar();
  // Dispose the component before createDom restores the Node globals.
  context.after(() => snackbar.destroy());
  const window = createDom(context, markup);
  context.mock.timers.enable({ apis: ['setTimeout'] });
  return { window, document: window.document, snackbar };
}

test('supports success and error roles and displays messages as text', (context) => {
  const { document, snackbar } = setup(context);
  snackbar.show('Games loaded');
  const element = document.querySelector('.snackbar');
  assert.equal(element.hidden, false);
  assert.equal(element.classList.contains('snackbar--success'), true);
  assert.equal(element.querySelector('.snackbar__symbol').textContent, '✓');
  assert.equal(element.getAttribute('role'), 'status');
  assert.equal(element.getAttribute('aria-live'), 'polite');

  snackbar.show('<img src=x onerror="bad()"> & unavailable', 'error');
  assert.equal(document.querySelectorAll('.snackbar').length, 1);
  assert.equal(element.classList.contains('snackbar--error'), true);
  assert.equal(element.classList.contains('snackbar--success'), false);
  assert.equal(element.querySelector('.snackbar__symbol').textContent, '!');
  assert.equal(element.getAttribute('role'), 'alert');
  assert.equal(element.getAttribute('aria-live'), 'assertive');
  assert.ok(!element.querySelector('img'));
  assert.equal(
    element.querySelector('.snackbar__message').textContent,
    '<img src=x onerror="bad()"> & unavailable',
  );
});

test('auto-dismisses after six seconds without stealing focus or disabling page buttons', (context) => {
  const { document, snackbar } = setup(context);
  const trigger = document.querySelector('#trigger');
  const onClick = context.mock.fn();
  trigger.addEventListener('click', onClick);
  trigger.focus();

  snackbar.show('Loaded');
  const element = document.querySelector('.snackbar');
  assert.equal(document.activeElement, trigger);
  trigger.click();
  assert.equal(onClick.mock.callCount(), 1);
  assert.equal(document.body.hasAttribute('inert'), false);
  context.mock.timers.tick(SNACKBAR_DURATION - 1);
  assert.equal(element.hidden, false);
  context.mock.timers.tick(1);
  assert.equal(element.hidden, true);
  assert.equal(document.activeElement, trigger);
});

test('replacing a message restarts its full timeout and cancels the previous timer', (context) => {
  const { document, snackbar } = setup(context);
  snackbar.show('First');
  context.mock.timers.tick(5000);
  snackbar.show('Second', 'error');
  const element = document.querySelector('.snackbar');

  context.mock.timers.tick(1000);
  assert.equal(element.hidden, false);
  assert.equal(element.querySelector('.snackbar__message').textContent, 'Second');
  context.mock.timers.tick(4999);
  assert.equal(element.hidden, false);
  context.mock.timers.tick(1);
  assert.equal(element.hidden, true);
});

test('manual dismissal restores focus only when it was inside the notification', (context) => {
  const { document, snackbar } = setup(context);
  const trigger = document.querySelector('#trigger');
  trigger.focus();
  snackbar.show('Loaded');
  const element = document.querySelector('.snackbar');
  const close = element.querySelector('button');
  close.focus();
  close.click();

  assert.equal(element.hidden, true);
  assert.equal(document.activeElement, trigger);
  context.mock.timers.tick(SNACKBAR_DURATION);
  assert.equal(element.hidden, true);
});

test('hosts a notification in the open dialog and dismisses it when that dialog closes', async (context) => {
  const { window, document, snackbar } = setup(
    context,
    '<button id="trigger">Open</button><dialog open><button>Retry</button></dialog>',
  );
  const dialog = document.querySelector('dialog');
  snackbar.show('Dialog request failed', 'error');
  const element = document.querySelector('.snackbar');
  assert.equal(element.parentElement, dialog);

  dialog.removeAttribute('open');
  dialog.dispatchEvent(new window.Event('close'));
  assert.equal(element.hidden, true);

  snackbar.show('Back on the page');
  assert.equal(element.parentElement, document.body);
  dialog.dispatchEvent(new window.Event('close'));
  await setImmediate();
  assert.equal(element.hidden, false);
});

test('works without Popover API support and can be recreated after cleanup', (context) => {
  const { window, document, snackbar } = setup(context);
  for (const name of ['showPopover', 'hidePopover']) {
    Object.defineProperty(window.HTMLElement.prototype, name, {
      configurable: true,
      value: undefined,
    });
  }
  snackbar.show('Fallback');
  assert.equal(document.querySelector('.snackbar').hidden, false);
  assert.equal(document.querySelector('.snackbar').hasAttribute('popover'), false);
  snackbar.dismiss();
  assert.equal(document.querySelector('.snackbar').hidden, true);
  snackbar.destroy();
  assert.ok(!document.querySelector('.snackbar'));
  context.mock.timers.tick(SNACKBAR_DURATION);

  snackbar.show('Recreated');
  assert.equal(document.querySelectorAll('.snackbar').length, 1);
  assert.equal(document.querySelector('.snackbar').hidden, false);
});

test('ignores blank messages without replacing or extending an existing notification', (context) => {
  const { document, snackbar } = setup(context);
  snackbar.show(' '.repeat(3));
  assert.ok(!document.querySelector('.snackbar'));
  snackbar.show('Keep this message');
  context.mock.timers.tick(5000);
  snackbar.show(' '.repeat(3), 'error');
  assert.equal(document.querySelector('.snackbar__message').textContent, 'Keep this message');
  context.mock.timers.tick(1000);
  assert.equal(document.querySelector('.snackbar').hidden, true);
});

test('keeps the close control focused when a newer notification replaces its message', (context) => {
  const { document, snackbar } = setup(context);
  const trigger = document.querySelector('#trigger');
  trigger.focus();
  snackbar.show('First message');
  const close = document.querySelector('.snackbar__close');
  close.focus();

  snackbar.show('Replacement message', 'error');
  assert.equal(document.activeElement, close);
  assert.equal(close.isConnected, true);
  assert.equal(document.querySelector('.snackbar__message').textContent, 'Replacement message');
  context.mock.timers.tick(SNACKBAR_DURATION);
  assert.equal(document.activeElement, trigger);
});

test('does not move focus back after the user has moved to another page control', (context) => {
  const { document, snackbar } = setup(
    context,
    '<button id="trigger">Load</button><button id="next">Next page</button>',
  );
  document.querySelector('#trigger').focus();
  snackbar.show('Loaded');
  const next = document.querySelector('#next');
  next.focus();
  context.mock.timers.tick(SNACKBAR_DURATION);
  assert.equal(document.activeElement, next);
});

test('closes a supported popover before moving it from the page into a dialog', (context) => {
  const { document, window, snackbar } = setup(
    context,
    '<button id="trigger">Open</button><dialog><button>Retry</button></dialog>',
  );
  // jsdom has no native top layer; these fakes test our API calls, not browser rendering.
  const openElements = new WeakSet();
  const calls = [];
  const prototype = window.HTMLElement.prototype;
  const matches = prototype.matches;
  class PopoverMethods extends window.HTMLElement {
    showPopover() {
      openElements.add(this);
      calls.push(['show', this.parentElement.tagName]);
    }

    hidePopover() {
      openElements.delete(this);
      calls.push(['hide', this.parentElement.tagName]);
    }

    matches(selector) {
      return selector === ':popover-open' ? openElements.has(this) : matches.call(this, selector);
    }
  }
  for (const name of ['showPopover', 'hidePopover', 'matches']) {
    Object.defineProperty(prototype, name, {
      configurable: true,
      value: PopoverMethods.prototype[name],
    });
  }

  snackbar.show('Page message');
  const dialog = document.querySelector('dialog');
  dialog.setAttribute('open', '');
  snackbar.show('Dialog message', 'error');
  assert.deepEqual(calls, [
    ['show', 'BODY'],
    ['hide', 'BODY'],
    ['show', 'DIALOG'],
  ]);
  assert.equal(document.querySelector('.snackbar').parentElement, dialog);
  snackbar.dismiss();
  assert.deepEqual(calls.at(-1), ['hide', 'DIALOG']);
  assert.equal(document.querySelector('.snackbar').hidden, true);
});
