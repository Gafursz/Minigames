# Story 4 — Feature 1: test foundation

## Result and scope

The task branch is `feature/test-foundation`, based on Story 3 commit
`85b56dfe03beb93f51593157c303eb3452c2f8bd` (PR #12). The story integration branch is
`story-4`. Application TypeScript and SCSS are unchanged by this feature.

The 128 existing Story 3 tests now run under Vitest. Five TypeScript tests were
added for the carousel countdown, producing **133 passing tests in 16 files**.
There are no skipped, todo, or deliberately failing cases. Network calls are
mocked, so tests neither depend on the public backend nor mutate its data.

The measured coverage for this source snapshot is:

| Metric     | Covered / total | Percentage |
| ---------- | --------------- | ---------- |
| Statements | 1279 / 1463     | 87.42%     |
| Branches   | 770 / 963       | 79.95%     |
| Functions  | 269 / 292       | 92.12%     |
| Lines      | 1181 / 1306     | 90.42%     |

The Story 4 requirement is aggregate **statement** coverage of at least 80%,
without rounding up. It is not an 80% requirement for every file or every metric.
The coverage command enforces the statement threshold. These figures describe
Feature 1; each subsequent feature must add tests for its own behavior and keep
the complete project above the threshold.

This completes the testing foundation. Firebase configuration, authentication,
session management, and mutations belong to later features. Their tests must be
added as their application logic is introduced. This baseline is not a claim
that all 150 testing points or all of Story 4 have already been completed.

## Why the test runner changed

Story 3 used Node's built-in test runner. Its assertions were meaningful, but the
Story 4 rubric explicitly requests Vitest or Jest and a project-wide coverage
report. Vitest fits our existing Vite, ES modules, TypeScript, and asset imports.
It is development tooling and does not introduce a UI framework or router.

The installed versions are Vitest 5.0.3 and `@vitest/coverage-v8` 5.0.3. The runner
and coverage provider are pinned together in `package.json` and the lockfile.
Node and jsdom type definitions are development dependencies too. The existing
jsdom package remains the simulated DOM used by the DOM suites.

## What each file does

| File or area                                               | Change and reason                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` / `package-lock.json`                       | Install matching testing dependencies, add common scripts, and preserve the old focused script names as Vitest aliases.                         |
| `vitest.config.ts`                                         | Discover `.test.ts` and `.test.mjs`, load common setup, limit workers to two, and configure full-source V8 coverage with an 80% statement gate. |
| `tests/setup.ts`                                           | Block accidental live fetches and restore spies, fake timers, and stubbed globals after each test.                                              |
| `tsconfig.tests.json`                                      | Typecheck the app, TypeScript tests, test entry modules, and configuration without generating JS.                                               |
| Existing `tests/**/*.test.mjs`                             | Keep their assertions and scenarios while replacing the Node test API, mock calls, timers, and cleanup hooks with Vitest equivalents.           |
| `tests/feedback/dom.mjs` / `tests/helpers/browser-dom.mjs` | Keep a fresh jsdom window per test and adapt its cleanup to Vitest.                                                                             |
| `tests/helpers/bundle.mjs`                                 | Remove the temporary-build helper, which is no longer needed.                                                                                   |
| `tests/slider/autoplay-timer.test.ts`                      | Add five focused countdown and lifecycle tests using fake time.                                                                                 |
| `eslint.config.js` / `.prettierignore`                     | Ignore generated coverage output, which is report data rather than authored source.                                                             |
| `README.md`                                                | Describe the current story, testing commands, measured baseline, and branch workflow.                                                           |

Existing assertions still use `node:assert/strict`, which works with Vitest.
There is no need to rewrite correct assertions merely to change their style.
New TypeScript timer tests use Vitest's `expect` matchers. Both styles fail the
same runner when expected application behavior is not observed.

## How tests now execute

`npm test` starts Vitest in single-run mode. It discovers every matching test file,
loads the shared setup, transforms TypeScript with Vite, and executes the tests.
Pure logic uses the Node environment. DOM suites explicitly create an isolated
jsdom window; they do not require Chrome or a running development server.

Previously, several tests built a temporary JavaScript bundle before importing
the application. Those tests now import the actual source or small existing
TypeScript re-export entry modules. Vite handles image and SCSS imports during
the tests, and coverage can map execution to the original source files.

Vitest serves its module graph at `/`. Our application still needs to see the
deployment base `/Minigames/`. The test configuration imports the production Vite
configuration and explicitly supplies its `base` as the test's `BASE_URL`.
This preserves the production router assumptions without modifying the router.

Node's old cleanup callbacks and Vitest's finish hooks have different ordering.
Vitest unwinds finish hooks in reverse registration order. The migration
registers DOM cleanup before component cleanup so components are destroyed
while their DOM is still available. The shared setup registers its final cleanup
first, so mocks and timers are restored after component and DOM disposal.

Application requests are mocked at the network boundary, not by replacing the
application behavior under test. Tests inspect endpoint URLs, query parameters,
request cancellation, rendered values, focus, history, and loading/error states.
An unexpected fetch cannot contact the live backend.

## Which existing behavior remains tested

| Area                                        |   Cases |
| ------------------------------------------- | ------: |
| API client and endpoint/query construction  |      17 |
| Content feedback and Snackbar               |      17 |
| Router, link handling, and page integration |      15 |
| Home API sections and request lifecycle     |      12 |
| Library cards and request lifecycle         |      10 |
| Category filtering and sorting              |      15 |
| API pagination                              |      10 |
| Game Details and public comments            |      14 |
| Dialog URLs, Back/Forward, and cleanup      |      18 |
| New autoplay timer tests                    |       5 |
| **Total**                                   | **133** |

All 128 original test names remain in the suite. Their behavioral assertions
were retained, including the seven Back/seven Forward dialog scenario, safe text
rendering, retry behavior, and cancellation of stale requests.

The five added tests verify observable timer behavior:

1. Advancing every four seconds, without duplicate timers after repeated starts.
2. Keeping the remaining countdown while hover and dialog pauses overlap.
3. Resetting the full countdown without overriding an active pause.
4. Canceling pending work on destruction and rejecting every restart path.
5. Avoiding rescheduling when the carousel is destroyed inside its callback.

Fake time advances both timers and `performance.now()`. The tests exercise the
real `AutoplayTimer` class and assert callback counts and remaining scheduled
work. No real multi-second wait is required.

## Coverage scope and interpretation

`coverage.include` is `src/**/*.ts`, so files count even when tests never import
them. The only explicit exclusion is `**/*.d.ts`, with a comment explaining that
declaration files have no executable logic. All 46 other source TypeScript files
appear in the report. We also retain the source's type-only `.ts` modules; their
zero executable statements do not add to the denominator.

No page, component, router, slider, API client, or bootstrap module is excluded.
For example, `src/main.ts` remains visible at 0%, and the older local favorite
helpers in `game-info.ts` have low coverage. Hiding those files would make the
report less honest. Story 4's favorites feature will replace that old behavior
with guarded server requests and corresponding tests.

The HTML report highlights which statements and branches were exercised. A high
percentage does not prove all behavior is correct: meaningful assertions and
failure cases still matter. Drag and gesture simulation also needs separate
native-browser verification. jsdom does not verify pixel layout, actual swipe
physics, the browser top layer, or Firebase's provider popup.

Reports are generated under `coverage/` and ignored by Git, ESLint, and Prettier.
These are formatting/lint exclusions for generated files, not coverage exclusions
for application logic. The delivered ZIP contains a report snapshot for review;
regenerate it after changing source or tests.

## Commands, explained before running

Run the commands from the repository root in Git Bash. Use a Node version allowed
by `package.json`; verification here used Node 24.19.0 and npm 11.9.0.

`npm` is the Node package manager. `ci` installs exactly the versions recorded in
`package-lock.json`, replacing the existing `node_modules` installation. It does
not change application source or update dependency versions. The project's
existing `prepare` script can configure Husky hooks during installation.

```bash
npm ci
```

`npm test` runs the `test` script, whose command is `vitest run`. The `run` argument
means one complete run followed by exit. A successful result currently reports
16 passing files and 133 passing tests. A nonzero exit status means verification
failed. It does not modify application source.

```bash
npm test
```

`npm run` executes a named package script. `test:coverage` expands to
`vitest run --coverage`: `--coverage` enables V8 measurement. It runs the same
tests, prints the full coverage table, and writes report files under `coverage/`.
It fails if a test fails or aggregate statements fall below 80%.

```bash
npm run test:coverage
```

`typecheck:tests` expands to `tsc -p tsconfig.tests.json`. `tsc` is the TypeScript
compiler; `-p` selects that configuration file. Inherited `noEmit` prevents JS
output, so this checks types without changing source or producing a build.
The retained JavaScript `.mjs` tests are run by Vitest and linted by ESLint;
this TypeScript command checks the `.ts` files.

```bash
npm run typecheck:tests
```

`test:watch` starts Vitest's watch mode. It remains running and reruns affected
tests when files change. Press `q` to quit. This is useful during development;
the one-shot `npm test` is the command for final verification.

```bash
npm run test:watch
```

For a focused check, `test:api` expands to `vitest run tests/api/`: the path filters
the test files to the API directory. The other existing aliases work the same
way (`test:ui`, `test:router`, `test:home`, `test:library`, `test:filters`,
`test:pagination`, `test:details`, and `test:dialogs`). A focused run is not the
full Story 4 coverage check.

```bash
npm run test:api
```

`lint` runs ESLint over authored project files. `format:check` asks Prettier to
check formatting without rewriting files. `build` runs the application's
TypeScript check and Vite production build, then the existing `postbuild` script
copies the SPA fallback to `dist/404.html`. Only the build writes production
artifacts; none of these commands changes application source.

```bash
npm run lint
npm run format:check
npm run build
```

## Branch integration and the next feature

Push `feature/test-foundation`, create its task PR with base `story-4`, and merge
that task PR after reviewing the checks. The ZIP's `START-HERE.md` explains every
import and Git command and includes a ready-to-review task PR description.

Feature 2 is `feature/auth-validation`. It should build on the integrated testing
foundation, implement the exact Login/Registration validation rules, and extend
these tests. Any delivered dependent branch must be integrated only after its
prerequisite task PR. The final `story-4` → `story-3` Cross-Check PR stays unmerged.

## References

- [Story 4 requirements](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/story-4.md)
- [Testing tooling](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-4-1-unit-testing-tooling.md)
- [Scripts and coverage scope](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-4-2-test-coverage-scripts.md)
- [Successful execution](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-4-3-successful-test-execution.md)
- [Coverage and meaningful tests](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-4-4-code-coverage-target.md)
- [Vitest coverage documentation](https://vitest.dev/guide/coverage)
