import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { build } from 'vite';

// Use Vite's real TS/assets transforms for DOM integration tests, without a browser.
export async function bundleModule(context, entry) {
  const directory = await mkdtemp(path.join(tmpdir(), 'minigames-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const result = await build({
    configFile: false,
    base: '/Minigames/',
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: { entry: fileURLToPath(new URL(`../../${entry}`, import.meta.url)), formats: ['es'] },
    },
  });
  const output = Array.isArray(result) ? result[0].output : result.output;
  const chunk = output.find((item) => item.type === 'chunk' && item.isEntry);
  if (!chunk) throw new Error('The test entry did not produce an ES module.');
  const filename = path.join(directory, 'entry.mjs');
  await writeFile(filename, chunk.code);
  return import(pathToFileURL(filename).href);
}
