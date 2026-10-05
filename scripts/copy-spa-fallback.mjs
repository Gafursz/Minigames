import { copyFile } from 'node:fs/promises';
import { URL } from 'node:url';

// GitHub Pages serves this application shell for direct /library and unknown paths.
await copyFile(
  new URL('../dist/index.html', import.meta.url),
  new URL('../dist/404.html', import.meta.url),
);
