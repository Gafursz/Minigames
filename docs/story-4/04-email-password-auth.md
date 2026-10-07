# Story 4 — Feature 4: Email/Password authentication

## What is ready

Branch: `feature/email-password-auth`, based on Feature 3 commit
`9d95d82f4633b5d3ce81b765c935d2ce568493c1`.

The validated forms now call Firebase Email/Password authentication. A successful
request creates the required five-minute MiniGames app session, updates the desktop
and mobile header, closes the dialog, and shows a success Snackbar. A failed request
keeps the form open and allows another attempt. Public Home and Library data still
use the existing REST API.

**Personal Firebase setup and a live browser sign-in remain required.** This feature
contains real SDK calls and tests with mocked SDK boundaries. No personal Firebase
web settings were supplied, so no cloud account was created during verification.
Missing configuration produces an honest error; it never simulates a signed-in user.
Follow [Feature 3's setup guide](03-firebase-foundation.md) first.

The official Email/Password task requires successful authentication to create the
app session and apply authenticated UI. That is why this feature includes the
necessary session, profile, and logout foundation. It does not yet implement Google
OAuth, favorites, comment submission/likes, or the complete authenticated Auth URL
guard and protected-action recovery flow. Those remain later Story 4 work.

## What changed, how, and why

| File                                                            | What it does                                                                                           | Why it is needed                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/auth/email-auth.ts`                                        | Wraps Firebase sign-in, account creation, profile update, and sign-out. Returns a small `AuthProfile`. | Keeps SDK calls out of dialog rendering and provides one mockable boundary.                   |
| `src/auth/auth-error.ts`                                        | Maps known Firebase/configuration/storage errors to understandable messages.                           | Users can retry without seeing provider internals or being told a failed operation succeeded. |
| `src/auth/app-session.ts`                                       | Validates, stores, restores, expires, and clears the five-minute app record.                           | Firebase identity and the short MiniGames session are separate requirements.                  |
| `src/features/auth-dialog/auth-dialog.ts`                       | Submits a snapshot of valid values; locks controls while awaiting the request; handles outcomes.       | Prevents duplicate requests, accidental dismissal, and stale async updates.                   |
| `src/features/auth-dialog/auth-form-validation.ts`              | Exposes current values and adds a pending lock to the existing validation controller.                  | Valid inputs must not re-enable Submit while authentication is still pending.                 |
| `src/app/app.ts`                                                | Connects the dialog, session, router, header, logout, and active-page checks.                          | Coordinates application state without adding a framework or router library.                   |
| `src/components/header-profile.ts`                              | Renders safe display names, initials, and an optional avatar in both header variants.                  | Replaces guest controls with visible authenticated state.                                     |
| `src/components/header.ts`                                      | Includes profile markup and attaches avatar load/error handlers with cleanup.                          | A broken photo falls back to initials and page navigation does not accumulate handlers.       |
| `src/features/auth-dialog/auth-dialog.scss`                     | Styles disabled buttons/links consistently and prevents disabled hover effects.                        | Pending controls should look unavailable as well as behave that way.                          |
| `src/styles/_tokens.scss`, `src/styles/components/_header.scss` | Add named disabled-opacity/profile-width tokens and responsive profile styling.                        | Keeps the existing SCSS organization and avoids new scattered dimensions.                     |
| `tests/auth/*.test.*`                                           | Adds SDK, session, error, initials, and dialog/application behavior tests.                             | Verifies the new logic using the existing Vitest setup.                                       |

## The login flow in plain language

1. Existing Feature 2 validation checks the active form. Invalid input makes no
   authentication request. Login needs a valid email and a password of at least six
   characters; registration uses the stronger rules already implemented.
2. The dialog captures the entered values. It disables inputs, Submit, tabs, Google,
   password visibility, and other auth actions. Inline mode links are unavailable.
   A live status message says “Signing in…” or “Creating account…”.
3. `App` checks the current session and waits for any earlier Firebase sign-out to
   finish. This prevents cleanup of a previous identity from racing a new login.
4. `emailAuth.login()` calls `signInWithEmailAndPassword()`. Registration calls
   `createUserWithEmailAndPassword()` and then waits for `updateProfile()` to save
   the form username as `displayName`. Email whitespace is trimmed; the password is
   passed unchanged.
5. On success, `AppSession.establish()` saves the allowed profile fields and the
   authentication time, then updates the header. If storage cannot save the record,
   the app remains a guest, requests Firebase sign-out, and displays an error.
6. The dialog closes and the router removes its `auth` query parameter. Success
   closes immediately so the Snackbar can be shown outside the dialog and remain
   visible for its usual six seconds. Normal manual closing keeps the existing
   animation. Focus returns to the original trigger, or to the page heading if the
   guest trigger has become hidden.

On failure, the dialog unlocks, preserves the entered values for correction, and
shows a friendly inline status plus error Snackbar. It does not automatically
repeat the operation. Registration can partially succeed if account creation works
but saving the profile fails; this has a distinct message, requests sign-out, and
creates no MiniGames session. The already-created Firebase account is not deleted.

While a request is pending, backdrop and Escape dismissal are blocked. A route
change that would remove the dialog, change page, or switch its mode is restored to
the pending auth route using the existing router. Unrelated query changes can
remain. When a view is destroyed, its request result cannot update the old dialog;
if authentication succeeds after application teardown, Firebase is signed out.

## The five-minute session

The namespaced localStorage key is `minigames:gafursz:app-session`. A record looks
like this; the real numeric timestamp is created with `Date.now()` at success:

```json
{
  "displayName": "Alex99",
  "email": "alex@example.com",
  "authenticatedAt": 1791360000000
}
```

`avatarUrl` is optional. The record does not contain a password, Firebase token,
refresh token, UID, or copied Firebase User object. Storage validation rejects
unexpected fields, malformed values, future timestamps, and non-HTTP(S) avatar
sources. It is still client-controlled teaching/demo state, not server-side security.

Expiration is always `authenticatedAt + 5 * 60 * 1000`. Reloading, focusing the page,
and navigating do not change `authenticatedAt`. A timer expires the session during
normal use. Startup, focus, visibility restoration, storage events, and SPA
navigation also check it, so returning to a suspended tab catches expiration.

Expiry or logout clears only this project's session key, changes the header to
Guest Mode, and calls Firebase `signOut()`. Unrelated localStorage is preserved.
An expiration produces one Snackbar for that expiration. A missing or invalid
session also starts as guest and requests provider cleanup. Firebase's persisted
user alone never creates or renews a MiniGames app session.

The UI becomes a guest immediately even if provider cleanup fails. A later startup
attempts cleanup again. A failed storage removal cannot restore the same rejected
record during that app instance. Application teardown clears the timer/listeners
without treating an ordinary reload as an explicit logout.

Future favorites/comment/like handlers must check this session before their
protected requests. They are not implemented in this feature. Their expired-session
Auth overlay, preservation of the underlying Game Details state, and no-automatic-
retry behavior must be completed with those later integrations.

## Header behavior

Both header variants use `displayName`, then the email's local part, then “Player”.
Names are assigned through `textContent`, so they cannot become HTML. Initials use
the first alphanumeric character of the first one or two whitespace-separated
words, uppercased, with `?` as the final fallback. A supplied HTTP(S) photo is shown
only after loading; errors restore the initials. Long names are truncated visually.

The session record drives this header. It does not subscribe to Firebase identity
changes to silently extend or recreate the app session. The complete guard that
prevents an already-authenticated user from opening an Auth URL is still pending.

## Tests: extend the suite, keep the requirement simple

No new testing framework, separate regression pipeline, or extra coverage exclusion
was added. “Regression checks” here means rerunning the existing Story 3/Feature 2
tests alongside the new ones, so routing and validation continue to work.

This feature adds **29 meaningful cases**:

- Five SDK-service cases: login arguments/profile data, registration name ordering,
  partial registration failure, provider failure/retry, and sign-out.
- Nine session cases: allowed stored fields, fixed expiry across reload/activity,
  cleanup ordering, missing/invalid records, edited timestamps, logout failures,
  unavailable storage, timer cleanup, and malformed data.
- Two friendly-error cases and seven name/initials cases.
- Six DOM/application cases: pending locks and route protection, validation gating
  and failed-login retry, registration/logout, safe restored profile/avatar and
  expiry, failed session storage, and stale authentication after teardown.

Final run: **230 passing tests in 25 files**, no failures, skipped cases, or todos.
Coverage includes **all 54 non-declaration source TypeScript files**:

| Metric     | Result               |
| ---------- | -------------------- |
| Statements | 89.70% — 1655 / 1845 |
| Branches   | 82.56% — 999 / 1210  |
| Functions  | 93.27% — 333 / 357   |
| Lines      | 92.73% — 1518 / 1637 |

The unchanged aggregate statement gate is **80%**. Tests mock Firebase/public
network boundaries and use jsdom for DOM behavior. They do not prove cloud provider
configuration, native browser layout, or a real successful Firebase request.
The ZIP includes raw logs, machine-readable metrics, and the HTML coverage report.

## Verification commands, explained before running

Run these from the repository root after importing the feature. `npm ci` installs
the exact lockfile dependencies, replacing `node_modules` without editing source.
`npm test` runs Vitest once; `npm run test:coverage` runs the same suite with coverage
and fails below 80% statements. `lint` checks ESLint; `format:check` checks Prettier
without rewriting files. `typecheck:tests` checks app and test TypeScript without
emitting JS. `typecheck:feedback` checks the existing feedback preview. `build`
typechecks the app and writes Vite output plus the SPA fallback under `dist/`.

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run typecheck:feedback
npm run build
```

To try it locally, configure your own ignored `.env.local` using Feature 3's guide.
`npm run dev` starts the development server. Open its printed `/Minigames/` URL;
Ctrl+C stops the server. Restart after changing environment values.

```bash
npm run dev
```

## Manual checks still required

1. Enable Email/Password in your Firebase project and complete the four web settings.
2. Register with an unused email, a valid username, and a valid password. Confirm the
   user appears in Firebase Authentication and has the expected `displayName`.
3. Log out, sign in with the correct credentials, and try a wrong password. Failure
   must keep the form open; retry must work without reopening it.
4. Throttle the connection in browser DevTools while submitting. Confirm all auth
   actions are locked and Escape/backdrop/mode changes cannot dismiss the request.
5. Inspect the namespaced app record in DevTools. Reload midway through the five
   minutes; its timestamp must remain unchanged. Let it expire and confirm Guest
   Mode, record removal, one expiry notification, and Firebase sign-out.
6. Test desktop and mobile headers, keyboard focus, long names, and an unavailable
   profile photo in a real browser. Unit tests are not a pixel/layout verification.

## Git integration and remaining features

On 7 October 2026, the public `story-3` and `story-4` refs both pointed to
`85b56dfe03beb93f51593157c303eb3452c2f8bd`; the prerequisite feature refs were not
published. This dependent branch therefore starts from the exact prepared Feature 3
tip. It does not claim those task PRs have merged. The importer requires the earlier
feature tip in local `story-4` and stops on dirty or conflicting history.

Integrate task PRs in order: test foundation, validation, Firebase foundation, then
this email/password flow. Preserve their original commits when merging; squash or
rebase changes the prerequisite identities used by the delivery bundles. Follow
`START-HERE.md` and the task PR draft rather than copying files over dirty work.

No GitHub push/merge, Windows import, or deployment was performed. Commit author and
committer are `Gafursz <gafurjon.sh@gmail.com>` with actual creation timestamps. The
package records them without claiming a work duration. Keep the final
`story-4` → `story-3` Cross-Check PR unmerged.

Next work remains Google OAuth, completion of the authenticated Auth URL/interaction
guards, and the favorites/comment/like mutations with their tests. This delivery
does not start those later features.

## References checked on 7 October 2026

- [Official Email/Password flow task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-2-auth-registration-api.md)
- [Official session task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-3-2-session-persistence-expiration.md)
- [Firebase Email/Password authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase user profile management](https://firebase.google.com/docs/auth/web/manage-users)
- [Firebase authentication persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
