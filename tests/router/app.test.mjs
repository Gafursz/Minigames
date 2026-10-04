import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { bundleModule } from '../helpers/bundle.mjs';
import { createBrowserDom } from '../helpers/browser-dom.mjs';

test('integrates page navigation, 404 recovery, history, and page cleanup', async (context) => {
  const { App } = await bundleModule(context, 'src/app/app.ts');
  let app;
  context.after(() => app?.destroy());
  const window = createBrowserDom(context);
  const { document } = window;
  // Later Home API integration can run in the same test without making live requests.
  context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json({ data: [], meta: {} }),
  );
  app = new App(document.querySelector('#app'));
  app.render();
  app.render();
  assert.equal(document.querySelectorAll('.header').length, 1);
  assert.match(document.querySelector('h1').textContent, /Take a Short Break/);
  assert.equal(document.title, 'MiniGames — Home');
  const oldBurger = document.querySelector('.header__burger');
  document.querySelector('.hero__button').click();
  assert.equal(window.location.pathname, '/Minigames/library');
  assert.equal(document.querySelector('h1').textContent, 'Game Library');
  assert.equal(document.activeElement, document.querySelector('h1'));
  oldBurger.click();
  assert.equal(oldBurger.getAttribute('aria-expanded'), 'false');

  const samePage = document.querySelector('main');
  document.querySelector('.header__link[aria-current="page"]').click();
  assert.equal(document.querySelector('main'), samePage);

  const unknown = document.createElement('a');
  unknown.href = '/Minigames/unknown';
  unknown.dataset.routerLink = '';
  document.querySelector('#app').append(unknown);
  unknown.click();
  assert.equal(document.querySelector('h1').textContent, 'Page not found');
  assert.equal(document.querySelectorAll('.header').length, 1);
  assert.equal(document.querySelectorAll('.footer').length, 1);
  assert.ok(!document.querySelector('.header__link[aria-current="page"]'));
  const back = once(window, 'popstate');
  window.history.back();
  await back;
  assert.equal(document.querySelector('h1').textContent, 'Game Library');
  const forward = once(window, 'popstate');
  window.history.forward();
  await forward;
  assert.equal(document.querySelector('h1').textContent, 'Page not found');
  document.querySelector('.not-found__link').click();
  assert.equal(window.location.pathname, '/Minigames/');
  assert.match(document.querySelector('h1').textContent, /Take a Short Break/);
  app.destroy();
  assert.equal(document.querySelector('#app').children.length, 0);
});

test('boots directly into an unknown route and migrates a legacy shared Library link', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    globalThis.Response.json({ data: [], meta: {} }),
  );
  const { App } = await bundleModule(context, 'src/app/app.ts');
  let app;
  context.after(() => app?.destroy());
  const window = createBrowserDom(context, '<div id="app"></div>', '/Minigames/%E0%A4%A');
  const root = window.document.querySelector('#app');
  app = new App(root);
  app.render();
  assert.equal(root.querySelector('h1').textContent, 'Page not found');
  app.destroy();

  window.history.replaceState({}, '', '/Minigames/#/library?category=puzzle&page=2');
  app = new App(root);
  app.render();
  assert.equal(window.location.pathname, '/Minigames/library');
  assert.equal(window.location.search, '?category=puzzle&page=2');
  assert.equal(window.location.hash, '');
  assert.equal(root.querySelector('h1').textContent, 'Game Library');
});
