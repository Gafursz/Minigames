import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles/main.scss';

import { App } from './app/app';
import { prepareFirebaseAuth } from './auth/firebase-client';

const root = document.querySelector<HTMLDivElement>('#app');

if (root) {
  void prepareFirebaseAuth();
  const app = new App(root);
  app.render();
}
