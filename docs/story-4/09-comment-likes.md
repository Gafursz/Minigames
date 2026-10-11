# Story 4 — Feature 9: Comment likes

Feature 9 implements the 15-point comment-like task on `feature/comment-likes`,
based on Feature 8 tip `146bba72e4c877fe464f81bfbcae9acd866a86b3`.
It extends the existing TypeScript comments component, session guard, HTTP client,
and SCSS tokens. No new dependencies or routing library are added.

## What users can do

Signed-in users can like and unlike each comment. A personalized comments GET
initializes each button from `isLikedByCurrentUser` and `likesCount`. Guest GETs
omit the email and guest clicks invoke Auth with a sign-in Snackbar. The underlying
game context remains recoverable through Feature 6; signing in never retries the
attempted like automatically.

Clicking a like button locks that button and displays an ellipsis. Its accessible
label announces the update and `aria-busy` is true. Other comment buttons remain
available. The active icon, accessible pressed state, and count change only after
a valid server response; the UI does not guess a new count.

## API contract and why retries matter

`POST /api/comments/{commentId}/like` sends JSON containing only the active session's
`userEmail`. The selected comment ID comes from the loaded comments response.
The endpoint both likes and unlikes. A successful HTTP 200 response must contain a
boolean `data.isLikedByCurrentUser` and a non-negative integer `data.likesCount`.
Malformed responses do not update the displayed state.

The assignment backend accepts public requests without Firebase bearer tokens.
The frontend session guard decides whether a mutation can be attempted; this is
not a substitute for backend authorization in a production system.

A request may reach the server even if its response is lost. Automatically sending
another POST could undo it. On failure, the control unlocks with its last confirmed
state and a Snackbar explains the uncertainty. Its next click performs only a
personalized GET refresh. A subsequent separate click can toggle again. No POST
is automatically replayed. If that GET fails, the existing comments error banner
provides a GET-only Retry button.

## How the implementation works

| Area           | Implementation and purpose                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| API wrapper    | `toggleCommentLike()` validates path input, email, HTTP status, and response fields. Existing shared JSON POST/error handling is reused.          |
| Comment markup | Each button stores its returned comment ID and confirmed count, and initializes its icon and `aria-pressed` from personalized data.               |
| Request map    | One AbortController per comment prevents duplicate in-flight toggles without locking unrelated buttons.                                           |
| Rendering      | `paintLike()` updates button state, title, icon, loading text, count, and accessibility together.                                                 |
| Session guard  | The current session is checked on every attempt, including retry. Guests receive Auth plus a warning; no like POST is sent.                       |
| Cleanup        | List refresh, logout, account change, and teardown cancel pending UI work. Response checks prevent stale data from updating another view or user. |
| SCSS           | The pending button uses existing opacity tokens and a progress cursor. Existing active-heart assets and colors are reused.                        |

Aborting a request cannot guarantee the server did not process it. A later
personalized GET retrieves the server's state. The code does not send a compensating
POST. Refreshing the list retains Feature 8's commenter color assignments and draft.

## Verification

The existing Vitest suite is extended with meaningful tests for the exact POST
contract, malformed response rejection, identity/path validation, unexpected status,
personalized and guest initial states, guest guard warnings, per-comment locks,
duplicate prevention, server-confirmed like/unlike counts and icons, GET-only
reconciliation after failures, and stale results after logout, teardown, expiration,
or account changes. Existing Story 3/4 tests also run.

**303 tests pass in 30 test files, with 91.69% aggregate statement coverage across
all 56 application TypeScript files.** Lint, formatting, typechecks, and build pass.

The ZIP contains recorded command output, test JSON, and the HTML coverage report.
All application TypeScript files remain included; the existing aggregate 80%
statement threshold and justified non-executable exclusions are unchanged.
Firebase/network boundaries and native dialog APIs are mocked in automated tests.

To repeat checks after importing, `npm ci` installs lockfile dependencies and
replaces `node_modules`. `npm test` runs all tests once; `test:coverage` measures
coverage and enforces its gate. `lint` checks ESLint; `format:check` checks Prettier;
`typecheck:tests` checks TypeScript without emitting files; `build` generates the
production app and SPA fallback under `dist`.

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

## Integration and remaining verification

The inspected remote `story-4` remains at `c08151e`, with Features 1–4 integrated.
This dependent branch includes the previously delivered Features 5–8 and preserves
the latest remote documentation and mobile-header styling already incorporated in
Feature 8. Unpushed Windows changes cannot be inspected here and must be retained
when integrating the task PR. Use the guarded bundle importer, not a snapshot copy
over your project. Its prerequisite is Feature 8 integrated with original history.

No push, remote PR merge, Windows import, deployment, or live backend like request
was performed. The package contains the task PR draft and command explanations.
Keep the final `story-4` → `story-3` Cross-Check PR **unmerged**.

Feature 9 completes the planned implementation packages. Before treating Story 4
as fully verified, integrate the task PRs and check the configured application in
a native browser:

1. Sign in and confirm comments GET includes the encoded email and correct initial
   active hearts. As a guest, confirm it omits email and clicking like opens Auth.
2. Like/unlike a comment; verify one POST per action, visible loading, and exact
   server counts. Reopen the game to verify persistence.
3. Try rapid clicks and two different comment buttons. Confirm each pending button
   is locked without blocking the other.
4. Simulate offline/network failure. Confirm the state does not optimistically
   change, no automatic POST retry occurs, and explicit retry performs a GET.
5. Let the fixed five-minute session expire or log out while a request is pending.
   Confirm guest reset, preserved public content, and no stale authenticated update.
6. Recheck Email/Password and Google sign-in, mobile header/menu behavior, Auth
   history guards, favorites, comment submission, and textarea scrolling with the
   real Firebase configuration. These live checks are separate from mock tests.

[Official comment-like task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-2-4-like-comment-api.md)
