import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { compile } from 'sass';
import { Snackbar } from '../../src/components/snackbar.ts';
import { createDom } from './dom.mjs';

test('compiled SCSS styles both BEM variants and hides a dismissed notification', (context) => {
  const snackbar = new Snackbar();
  context.after(() => snackbar.destroy());
  const window = createDom(context);
  const { document } = window;
  const stylesheet = document.createElement('style');
  stylesheet.textContent = compile(
    fileURLToPath(new URL('../../src/styles/components/_snackbar.scss', import.meta.url)),
  ).css;
  document.head.append(stylesheet);

  snackbar.show('Loaded');
  const element = document.querySelector('.snackbar');
  const success = window.getComputedStyle(element);
  assert.equal(success.position, 'fixed');
  assert.equal(success.display, 'flex');
  assert.equal(success.borderTopStyle, 'solid');
  const successColor = success.borderTopColor;

  snackbar.show('Could not load', 'error');
  const error = window.getComputedStyle(element);
  assert.notEqual(error.borderTopColor, successColor);
  assert.equal(
    window.getComputedStyle(element.querySelector('.snackbar__symbol')).color,
    error.borderTopColor,
  );
  assert.equal(
    window.getComputedStyle(element.querySelector('.snackbar__message')).overflowWrap,
    'anywhere',
  );

  snackbar.dismiss();
  assert.equal(window.getComputedStyle(element).display, 'none');
});
