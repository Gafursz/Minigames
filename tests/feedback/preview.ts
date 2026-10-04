import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '../../src/styles/main.scss';
import './preview.scss';
import { ContentFeedback } from '../../src/components/content-feedback';
import type { SkeletonLayout } from '../../src/components/content-feedback';
import { snackbar } from '../../src/components/snackbar';

const root = document.querySelector<HTMLElement>('#feedback-region');
if (!root) throw new Error('The preview content region is missing.');
const feedback = new ContentFeedback(root);
const previewState = {
  retryCount: 0,
  interactionCount: 0,
  replacementTimer: undefined as ReturnType<typeof globalThis.setTimeout> | undefined,
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

function bind(id: string, callback: () => void): void {
  document.querySelector(`#${id}`)?.addEventListener('click', callback);
}

function renderContent(): void {
  feedback.showContent('<p class="feedback-preview__loaded">Content loaded successfully.</p>');
}

function countRetry(): void {
  previewState.retryCount += 1;
  const text = document.querySelector('#retry-count');
  if (text) text.textContent = `Retry calls: ${previewState.retryCount}`;
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-layout]')) {
  button.addEventListener('click', () => {
    feedback.showLoading(button.dataset.layout as SkeletonLayout, 'Loading this section…');
  });
}

bind('show-error', () => {
  feedback.showError({
    title: 'Unable to load games',
    message: 'The server could not be reached. Please try again.',
    onRetry: async () => {
      countRetry();
      await delay(700);
      renderContent();
      snackbar.show('Games loaded successfully.');
    },
  });
});

bind('show-retry-failure', () => {
  feedback.showError({
    message: 'Try again to check that a failed retry stays usable.',
    onRetry: async () => {
      countRetry();
      await delay(700);
      throw new Error('Still offline. Please check your connection and try again.');
    },
  });
});

bind('show-empty', () => {
  feedback.showEmpty({
    title: 'Data Not Found',
    message: 'No games match these filters. Try another category.',
  });
});
bind('show-content', renderContent);
bind('show-literal', () => {
  const message = '<img src="invalid" onerror="window.feedbackInjected=true"> <b>plain text</b>';
  feedback.showEmpty({ title: 'Text safety check', message });
  snackbar.show(message, 'error');
});
bind('show-success', () => snackbar.show('Games loaded successfully.'));
bind('show-notification-error', () =>
  snackbar.show('Unable to load games. Please try again.', 'error'),
);
bind('show-long-message', () => {
  snackbar.show(
    `A long message must wrap without horizontal scrolling: ${'long-text-'.repeat(35)}`,
    'error',
  );
});
bind('replace-notification', () => {
  globalThis.clearTimeout(previewState.replacementTimer);
  snackbar.show('First notification.');
  const status = document.querySelector('#notification-status');
  if (status) status.textContent = 'First notification shown.';
  previewState.replacementTimer = globalThis.setTimeout(() => {
    snackbar.show('Second notification has its own six-second timeout.', 'error');
    if (status) status.textContent = 'Second notification replaced the first after three seconds.';
  }, 3000);
});
bind('count-click', () => {
  previewState.interactionCount += 1;
  const text = document.querySelector('#interaction-count');
  if (text) text.textContent = `Page clicks: ${previewState.interactionCount}`;
});

const dialog = document.querySelector<HTMLDialogElement>('#test-dialog');
bind('open-dialog', () => dialog?.showModal());
bind('dialog-notification', () =>
  snackbar.show('This notification belongs to the open dialog.', 'error'),
);
bind('close-dialog', () => dialog?.close());

const frame = document.querySelector<HTMLIFrameElement>('#size-preview');
function loadFrame(width: number): void {
  if (!frame) return;
  frame.width = String(width);
  frame.title = `${width} px feedback preview`;
  frame.src = './frame.html';
}
bind('check-375', () => loadFrame(375));
bind('check-768', () => loadFrame(768));
loadFrame(375);
feedback.showLoading('leaderboard', 'Loading leaderboard…');

globalThis.addEventListener('pagehide', () => {
  globalThis.clearTimeout(previewState.replacementTimer);
  feedback.destroy();
  snackbar.destroy();
});
