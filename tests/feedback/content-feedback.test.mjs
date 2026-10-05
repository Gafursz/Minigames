import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { ContentFeedback } from '../../src/components/content-feedback.ts';
import { createDom } from './dom.mjs';

test('shows busy skeletons for all five areas and clears them when content arrives', (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);

  const layouts = Object.entries({
    cards: 6,
    slider: 3,
    leaderboard: 5,
    details: 1,
    comments: 3,
  });
  for (const [layout, count] of layouts) {
    feedback.showLoading(layout, 'Loading <games> & records…');
    assert.equal(root.getAttribute('aria-busy'), 'true');
    assert.equal(root.querySelector('[role="status"]').textContent, 'Loading <games> & records…');
    assert.ok(!root.querySelector('games'));
    assert.equal(root.querySelectorAll('.feedback-skeleton__item').length, count);
    assert.equal(root.querySelector('.feedback-skeleton').getAttribute('aria-hidden'), 'true');
  }

  feedback.showContent('<p>Server content</p>');
  assert.equal(root.getAttribute('aria-busy'), 'false');
  assert.ok(!root.querySelector('.feedback-skeleton'));
  assert.equal(root.textContent, 'Server content');
});

test('keeps empty results distinct from errors and renders untrusted messages as text', (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);
  const message = '<img src=x onerror="bad()"> & "quotes"';

  feedback.showEmpty({ title: '<b>Data Not Found</b>', message });
  assert.equal(root.querySelector('h3').textContent, '<b>Data Not Found</b>');
  assert.equal(root.querySelector('p').textContent, message);
  assert.ok(!root.querySelector('img, b, button, [role="alert"]'));
  assert.ok(root.querySelector('[role="status"]'));
  assert.equal(root.getAttribute('aria-busy'), 'false');

  feedback.showError({ title: '<b>Failed</b>', message, onRetry: () => {} });
  assert.ok(root.querySelector(':scope [role="alert"] button'));
  assert.equal(root.querySelector('h3').textContent, '<b>Failed</b>');
  assert.equal(root.querySelector('p').textContent, message);
  assert.ok(!root.querySelector('img, b'));
});

test('dispatches retry once while pending, then lets the caller render fresh content', async (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);
  const pending = Promise.withResolvers();
  const onRetry = context.mock.fn(async () => {
    await pending.promise;
    feedback.showContent('<p>Loaded after retry</p>');
  });
  feedback.showError({ message: 'Offline', onRetry });
  const button = root.querySelector('button');

  button.click();
  button.click();
  assert.equal(onRetry.mock.callCount(), 1);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Retrying…');

  pending.resolve();
  await setImmediate();
  assert.equal(root.textContent, 'Loaded after retry');
  assert.equal(root.getAttribute('aria-busy'), 'false');
});

test('keeps failed retries usable and escapes the new error message', async (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);
  const onRetry = context.mock.fn(async () => {
    throw new Error('<img src=x> Still offline');
  });
  feedback.showError({ message: 'Offline', onRetry });
  const button = root.querySelector('button');

  button.click();
  await setImmediate();
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Retry');
  assert.equal(root.querySelector('p').textContent, '<img src=x> Still offline');
  assert.ok(!root.querySelector('img'));

  button.click();
  await setImmediate();
  assert.equal(onRetry.mock.callCount(), 2);
});

test('removes obsolete retry listeners when replacing or destroying a section', (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);
  const onRetry = context.mock.fn();
  feedback.showError({ message: 'Offline', onRetry });
  const oldButton = root.querySelector('button');

  feedback.showLoading('cards');
  oldButton.click();
  assert.equal(onRetry.mock.callCount(), 0);

  feedback.showError({ message: 'Offline again', onRetry });
  const button = root.querySelector('button');
  feedback.destroy();
  button.click();
  assert.equal(onRetry.mock.callCount(), 0);
  assert.equal(root.hasAttribute('aria-busy'), false);
});

test('a late failed retry cannot overwrite a newer empty state', async (context) => {
  const { document } = createDom(context);
  const root = document.querySelector('#region');
  const feedback = new ContentFeedback(root);
  const pending = Promise.withResolvers();
  feedback.showError({ message: 'Old failure', onRetry: () => pending.promise });
  root.querySelector('button').click();

  feedback.showEmpty({ title: 'Data Not Found', message: 'New category has no games.' });
  pending.reject(new Error('Late failure from old request'));
  await setImmediate();

  assert.equal(root.querySelector('p').textContent, 'New category has no games.');
  assert.ok(!root.querySelector('button, [role="alert"]'));
});
