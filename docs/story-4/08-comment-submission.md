# Story 4 — Feature 8: Comment submission and avatars

Feature 8 implements comment submission (20 points) and commenter avatar styling
(3 points) on `feature/comment-submission`. It starts from Feature 7 tip
`71a716e798fc75f1d2cd72fc383a286e850dec76`. Integrate the previous feature PRs into
`story-4` before importing this dependent branch. Comment likes remain Feature 9.

## What changes for users

Authenticated users can send a comment with the button or Enter. Shift+Enter keeps
a newline; Enter during input-method composition does not submit. The textarea
expands up to the existing SCSS maximum height, then scrolls internally.

Whitespace is trimmed. Empty text or more than 500 characters is rejected before
network activity. During submission the textarea and button are disabled, the
form reports `aria-busy`, and the hint displays sending feedback. Duplicate
submission events cannot send a second request.

Guest controls are disabled. The handler still checks the active session at action
time, so expiration between rendering and submission invokes the existing Auth
recovery flow. Login never automatically resubmits a draft.

## Request and response flow

1. The session guard supplies `email` and `displayName`. The API requires a name
   of 2–30 characters; an incompatible profile receives an explanatory message.
2. `POST /api/games/{slug}/comments` sends JSON containing `userEmail`,
   `authorName`, and trimmed `text`. No Firebase bearer token is required by this
   assignment backend. The frontend session guard is not a backend security boundary.
3. Only a `201` response is treated as confirmed creation. The form clears and
   its height resets. The POST response has no total-count metadata.
4. A personalized GET requests the latest comments using `limit=3`, `sort=newest`,
   and the URL-encoded user email. Its data replaces the list and its
   `meta.totalComments` supplies the heading count, including comments not displayed.

On a definitive 4xx rejection (excluding timeout status 408), the form unlocks,
retains the text, and permits a deliberate retry. On network failure, a timeout,
a server error, or unexpected success status, the Snackbar explains that the
outcome is unknown. The draft stays and there is no automatic POST retry.

If creation succeeds but the subsequent GET fails, the draft stays cleared to
avoid implying that the comment was not sent. The existing error banner offers a
GET-only retry to recover the list. No additional creation request is sent.

## How the implementation fits the project

| File                                             | Change and purpose                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `src/api/http-client.ts`                         | Optional expected-status check shared by JSON POST requests; existing favorite requests are unchanged.    |
| `src/api/minigames-api.ts`                       | Comment POST wrapper with input checks and optional user email for comments GET.                          |
| `src/components/game-comments.ts`                | Session-aware submission, locking, Enter handling, resizing, reset/retry behavior, and avatar assignment. |
| `src/features/game-details/game-details.ts`      | Pass the full profile and session guard to comments; initialize identity before loading comments.         |
| `src/styles/_tokens.scss`                        | Name the three existing palette colors as `avatar-random` tokens.                                         |
| `src/styles/components/_game-comments.scss`      | Use those tokens and style disabled/error inputs with existing tokens.                                    |
| `tests/game-details/comment-submission.test.mjs` | API, form, recovery, identity, and avatar tests in the existing Vitest suite.                             |

Returned comment text is assigned with `textContent`, so HTML-looking text remains
literal text. Client rendering is not a replacement for backend sanitization.
Other displayed strings continue to use the project's existing escaping helpers.

## Avatars, session changes, and cleanup

The form avatar uses the uppercase first non-whitespace character of the current
profile name. Each commenter gets a randomly selected color from the existing
three-color token palette. A map keyed by trimmed username keeps that assignment
stable across ordinary list refreshes while the view is mounted. Actual teardown
clears the map; a later mount can choose another color.

Opening a new Game Details view clears the textarea. Suspending the existing game
behind Auth preserves its draft under Feature 6's recovery behavior. Logout locks
the form while retaining the draft. Expiration, account changes, and teardown
abort pending work and prevent stale POST results from changing the current view.
An aborted request may already have reached the server; it is never automatically
replayed. Public comments remain readable in guest mode.

## Existing changes preserved

The refreshed remote `story-4` was `c08151e`, including Feature 4. This package
preserves its updated Feature 1–4 guides and authenticated mobile-header styling
from `7305a81`. Earlier input-focus styling and Features 5–7 remain intact.
Features 5–7 were not yet integrated in that inspected remote snapshot.

The complete source snapshot is for inspection or a separate copy. Import the
bundle and review the task PR so newer local edits are retained; do not overwrite
your Windows project with the snapshot. No push, remote merge, deployment, or
Windows import was performed here. Keep the final `story-4` → `story-3` PR unmerged.

## Verification and commands

Tests cover guest locking, session checking, POST identity and trimmed payload,
1/500-character boundaries, empty/long rejection, pending locks and duplicates,
Enter/Shift+Enter/composition, success reset and full count, definitive/ambiguous
failures, GET-only refresh retry, literal-text rendering, stable avatar colors,
auto-growth/reset, and late responses after logout or teardown.

**285 tests pass in 29 test files, with 91.49% aggregate statement coverage across
all 56 application TypeScript files.** Lint, formatting, typechecks, and build pass.
Recorded results and complete logs are in the ZIP's `verification.json`,
`verification/`, and `coverage-report/`. All application TypeScript files remain
included in the existing 80% aggregate statement coverage gate.

After import, `npm ci` installs locked dependencies and replaces `node_modules`.
`npm test` runs the full suite once. `test:coverage` measures coverage and checks
its threshold. `lint` checks ESLint, `format:check` checks Prettier, and
`typecheck:tests` checks TypeScript without output. `build` writes production
files and the SPA fallback under `dist`.

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

## Manual checks still required

With your configured Firebase app and native browser, verify real submission,
visible textarea maximum-height scrolling, mobile layout, focus behavior, and
server persistence. Try Send, Enter, Shift+Enter, an expired session, and an offline
request. Confirm refresh uses the full server count and that retry never silently
posts twice. The automated suite mocks Firebase/network boundaries and native
browser methods; this run did not post comments to the live backend.

- [Comment submission task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-2-2-comment-submission-form.md)
- [Comment avatar task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-2-3-comment-avatar-styling.md)
