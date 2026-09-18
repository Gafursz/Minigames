import './styles/main.scss';

import { App } from './app/App';

const root = document.querySelector<HTMLDivElement>('#app');

if (root) {
  const app = new App(root);
  app.render();
}
