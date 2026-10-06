import assert from 'node:assert/strict';
import { test } from 'vitest';
import { URL } from 'node:url';
import { isRouterLink } from '../../src/router/links.ts';
import { createDom } from '../feedback/dom.mjs';

test('only intercepts marked internal links with an ordinary primary-button click', (context) => {
  const window = createDom(context, '<a data-router-link href="/Minigames/library">Library</a>');
  const link = window.document.querySelector('a');
  const current = new URL(window.location.href);
  const click = (options = {}) => new window.MouseEvent('click', { cancelable: true, ...options });
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), true);
  for (const options of [
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ]) {
    assert.equal(isRouterLink(link, click(options), current, '/Minigames/'), false);
  }
  const prevented = click();
  prevented.preventDefault();
  assert.equal(isRouterLink(link, prevented, current, '/Minigames/'), false);
  link.target = '_blank';
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), false);
  link.target = '_self';
  link.setAttribute('download', '');
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), false);
  link.removeAttribute('download');
  link.href = 'https://outside.test/Minigames/';
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), false);
  link.href = '/outside-the-mount/';
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), false);
  link.href = '/Minigames/library';
  delete link.dataset.routerLink;
  assert.equal(isRouterLink(link, click(), current, '/Minigames/'), false);
});
