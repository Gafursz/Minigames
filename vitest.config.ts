import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Pure logic runs in Node. DOM suites create their own isolated jsdom window.
      environment: 'node',
      // Vitest serves modules at '/'; the app must still see its deployed Vite base.
      env: { BASE_URL: viteConfig.base },
      include: ['tests/**/*.test.{ts,mjs}'],
      setupFiles: ['./tests/setup.ts'],
      maxWorkers: 2,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: [
          '**/*.d.ts', // Type declarations have no executable application logic.
        ],
        reporter: [['text', { skipFull: false }], 'text-summary', 'html', 'json-summary', 'json'],
        reportsDirectory: './coverage',
        // Story 4 measures aggregate statements across all application-logic files.
        thresholds: { statements: 80 },
      },
    },
  }),
);
