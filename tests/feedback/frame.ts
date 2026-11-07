import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '../../src/styles/main.scss';
import './preview.scss';
import { ContentFeedback } from '../../src/components/content-feedback';
import { snackbar } from '../../src/components/snackbar';

const root = document.querySelector<HTMLElement>('#frame-region');
if (!root) throw new Error('The frame content region is missing.');
const feedback = new ContentFeedback(root);

document.querySelector('#frame-error')?.addEventListener('click', () => {
  feedback.showError({
    title: 'Unable to load games',
    message: `Long server messages should wrap safely: ${'long-text-'.repeat(20)}`,
    onRetry: () => feedback.showContent('<p>Retry worked.</p>'),
  });
});
document.querySelector('#frame-empty')?.addEventListener('click', () => {
  feedback.showEmpty({ title: 'Data Not Found', message: 'No games match these filters.' });
});
document.querySelector('#frame-loading')?.addEventListener('click', () => {
  feedback.showLoading('cards', 'Loading games…');
});
document.querySelector('#frame-notification')?.addEventListener('click', () => {
  snackbar.show(`Long messages must fit this viewport: ${'long-text-'.repeat(25)}`, 'error');
});
feedback.showLoading('cards', 'Loading games…');
