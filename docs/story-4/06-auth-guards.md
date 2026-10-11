# Story 4 — Feature 6: Auth guards and session recovery

Feature 6 completes Auth dialog access guards and prepares protected game controls
for later API mutations. It extends the existing router, app session, and dialogs;
it adds no framework, router library, storage record, or mutation endpoint.

## What changes for users

- An active app session prevents Login/Registration from opening through header
  controls, a direct URL, reload, or browser history. The router removes only
  `auth`, replaces that history entry, and shows an already-signed-in Snackbar.
- Invalid or expired sessions recover as guests before this decision. Guests can
  open Auth normally. The fixed five-minute lifetime is unchanged.
- A guest favorite/comment/like attempt opens Auth while keeping `game` and the
  Library query parameters in the URL. Only Auth is visible. Closing it returns
  to the same Game Details DOM, draft, scroll position, and public data.
- Successful sign-in returns to the game with authenticated UI. The attempted
  action is **not automatically retried**. No favorite, comment, or like mutation
  is implemented in this feature; valid users receive an honest later-update notice.
- Logout leaves public content open in guest mode. If Firebase sign-out fails,
  local guest state remains authoritative and an error Snackbar explains the failure.

## How and why

| Area                       | Implementation and reason                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route parser               | Auth is the active dialog when `auth` and `game` coexist. Keeping `game` gives close/history/reload a recoverable target.                                                                                   |
| Router                     | An optional guard resolves navigation before rendering. Guarded changes use `replaceState`; preserving the supplied URL avoids rewriting unrelated path/query/hash values.                                  |
| App                        | `requireSession()` checks the current record at action time, returns a profile for valid sessions, or opens Auth and returns `undefined`. Future mutation handlers must stop when it returns no profile.    |
| Game Details               | `suspend()` closes the native dialog without destroying its content or requests. Reopening the same game resumes it rather than resetting the draft or refetching. Actual close/navigation still cleans up. |
| Comments/favorite controls | Injected guards are shared by the three entry points. They do not fabricate successful mutations or change counts.                                                                                          |
| Auth request races         | Guarding waits while a request is locked. On unlock, a queued check handles a session established in another tab. Normal successful sign-in closes Auth without an extra already-signed-in notification.    |
| App session                | A sign-out error callback reports provider cleanup failure while preserving guest state. Missing guest startup does not generate a misleading sign-out error.                                               |

The URL remains the navigation source of truth. Suspended DOM is temporary UI
state, not a second route store. A reload can reconstruct the underlying game
from its URL, but does not restore an unsaved textarea draft from before reload.

The existing `minigames:gafursz:app-session` record contains only display name,
email, authentication time, and optional avatar URL. It contains no credentials.
Client storage and these guards are teaching mechanisms, not backend security:
the assignment's public backend does not authenticate these requests.

## Existing work preserved

This branch starts at Feature 5 tip
`cb66b6ec14c6bba099c87187b68074b392b68fb1`. The inspected remote Story 4 tip was
`448240b7e5ee0f33d6c08b95ea08670be0cb27b1`, with Features 1–3 merged.
Feature 4 and Feature 5 must be integrated before Feature 6.

The source snapshot incorporates the exact newer input-focus SCSS from
`e82722b6cae7020d67b4268d089e613e3227c7c3` and the updated Feature 3 guide from
remote commit `2ad9c70`. Their original remote history remains untouched.
The updated guide records your completed Firebase setup; this run did not independently
verify your console settings, local environment, or live sign-in.

Import through the supplied Git bundle rather than copying the full snapshot over
your checkout. Later local styling/documentation edits must be retained when
reviewing the task PR. No push, remote merge, Windows import, or deployment was done.

## Verification

The existing Vitest suite is extended with meaningful guard integration tests:

- direct/reload-style Auth entry, exact non-Auth URL preservation, and hidden UI triggers;
- malformed/expired records and unrelated storage preservation;
- game draft/DOM/scroll recovery, Back/Forward, and no duplicate game fetch;
- expiration before a protected action, successful recovery, and no automatic retry;
- cross-tab login, including a pending request that subsequently fails;
- guest like count preservation and GET-only network activity;
- logout with rejected provider sign-out.

One existing Story 3 assertion was deliberately updated: Auth plus Game no longer
removes `game`. All other existing tests continue to run. The pending-request test
waits for observable dialog closure rather than assuming a zero-duration animation
timer finishes within one event-loop turn.

**250 tests pass in 27 test files; aggregate statement coverage is 90.56% across
all 55 application TypeScript files.** Lint, formatting, TypeScript checks, and
production build pass. Final counts and full command output are in the package's `verification.json`,
`verification/`, and `coverage-report/`. All application TypeScript files remain
included in coverage; only the existing non-executable exclusions remain.
No separate regression framework or coverage-only dummy tests were introduced.

To repeat checks, first use the package import guide. `npm ci` installs the locked
dependencies and replaces `node_modules`. `npm test` runs the complete suite once.
`test:coverage` measures it and enforces the 80% statement gate. `lint` and
`format:check` inspect source quality; `typecheck:tests` checks TypeScript without
emitting files. `build` generates the production app and SPA fallback in `dist`.

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

## Manual acceptance checks still needed

With your configured Firebase project and a native browser:

1. Sign in, then enter a Library URL with filters, pagination, `game`, `auth`, and
   a hash. Confirm Auth stays closed and only its query parameter is removed.
2. Repeat with Back/Forward and reload. Check the already-signed-in notification
   and absence of an extra history entry from canonicalization.
3. As a guest, open a game, type a draft, scroll, and click a protected control.
   Cancel Auth; confirm the game, draft, and scroll return. Repeat with successful
   sign-in and check that no action happens automatically.
4. Wait until the fixed five-minute session expires. Repeat the protected action
   and check guest recovery, then sign in again.
5. Repeat on mobile, including menu closure, keyboard focus, and dialog animations.

Automated tests mock Firebase/network boundaries and browser-only dialog methods.
They do not prove native rendering, live OAuth, or deployed configuration.
Favorites, comment submission, comment likes, and their API state updates are later
features and are intentionally not started here.

## Requirements

- [Auth URL/UI guard](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-3-4-auth-dialog-url-guard.md)
- [Session recovery](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-3-2-session-persistence-expiration.md)
- [Logout guest reset](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-3-3-logout-guest-mode-reset.md)
