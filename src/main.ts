import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import './styles/main.scss';

import { App } from './app/app';

const root = document.querySelector<HTMLDivElement>('#app');

if (root) {
  const app = new App(root);
  app.render();
}
