# Story 4 — Feature 5: Google sign-in

## Delivery and scope

Branch: `feature/google-auth`. Prerequisite: Feature 4 at
`6c798eb90fb6cf347637ea9189de08309bdaa509`.

Google sign-in now works through Firebase's popup API from both Login and
Registration. It uses the same pending locks, error feedback, five-minute app
session, profile header, logout, and expiration behavior as Email/Password.

**The code is ready; your Google provider configuration and live account test are
still required.** No personal Firebase settings or authenticated Console access
were available. This delivery does not claim the provider was enabled, a real
Google account was signed in, or a deployment was performed.

On 8 October 2026, public `story-4` was at
`db9bbabf92a525d9a9c2e17db9387cc280547898`, including Feature 1 through PR #16.
Features 2–4 were not yet integrated there. Feature 5 therefore starts from the
exact prepared Feature 4 tip and must be integrated after those task PRs.

## What changed and why

| File                                      | Change and purpose                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/auth/google-auth.ts`                 | Creates a Google provider, requests an account chooser, opens Firebase's popup, and returns only the allowed profile fields.                 |
| `src/auth/auth-error.ts`                  | Adds useful messages for canceled, interrupted, blocked, unauthorized-domain, and conflicting-provider attempts.                             |
| `src/features/auth-dialog/auth-form.ts`   | Replaces the Google placeholder action with a real `data-auth-google` control in both form variants.                                         |
| `src/features/auth-dialog/auth-dialog.ts` | Shares one pending/success/error runner between email and Google requests. Google does not require valid email-form fields.                  |
| `src/app/app.ts`                          | Shares session creation and cleanup between providers; accepts an injectable Google operation for tests.                                     |
| `tests/auth/google-auth.test.ts`          | Tests the SDK boundary, account chooser, minimal profile, cancellation/retry, missing email, and setup failure.                              |
| `tests/auth/auth-flow.test.mjs`           | Tests both form variants, locks, cancellation, retry, session persistence, profile rendering, and URL cleanup with a mocked Google boundary. |

No new package, framework, external router, or SCSS convention was introduced. The
existing Firebase dependency and disabled-control styling are reused. Feature 5
does not modify SCSS. Preserve any focus-style changes you make in your Windows
checkout: use the bundle and task PR process, rather than copying this package's
complete source snapshot over your local files.

## How the request works

1. Click “Continue with Google” or “Sign up with Google”. Empty or invalid email-form
   fields do not block this independent sign-in method.
2. The dialog immediately locks inputs, tabs, email Submit, Google buttons, and
   other auth actions. It displays “Connecting to Google…”. Escape and backdrop
   dismissal remain blocked while the operation is pending.
3. The application waits for any earlier identity cleanup, then calls
   `signInWithGoogle()`. Firebase initialization is reused from Feature 3.
4. `GoogleAuthProvider` with `prompt: 'select_account'` requests account selection.
   `signInWithPopup()` performs the provider operation. A popup flow keeps the
   current SPA URL, filters, and dialog state available without redirect recovery.
5. On success, only `displayName`, `email`, and optional `avatarUrl` are returned.
   No OAuth access token, Firebase token, or password is extracted into app storage.
6. The existing session controller saves the profile and the new successful-auth
   timestamp. The header updates, the dialog closes, the router removes `auth`,
   and a success Snackbar appears. Expiration remains fixed at five minutes.

If Google returns no email, the service requests sign-out and rejects the result;
it cannot invent an email or create an invalid session. Missing name/photo values
use the existing header fallback behavior. Storage failure and late results after
application teardown follow the same safe guest-state behavior as email login.

## Failure and cancellation

Closing the provider popup is a canceled request. The app keeps the Auth dialog
open, shows an understandable message, preserves the email-form values, and
unlocks controls. It does not retry automatically. A user can try Google again or
switch to Email/Password.

Blocked popups explain that popups must be allowed for this site. An unauthorized
domain explains that site configuration needs attention. An email already linked
to another provider asks the user to use that sign-in method; this feature does not
silently link accounts. Raw Firebase error messages are not displayed.

Firebase initialization and prior sign-out may need time on the first attempt.
If browser popup policy blocks that attempt, allow popups and retry after setup
finishes. Actual popup behavior must be checked in the browsers used for review.
This feature does not add a redirect fallback.

## Enable Google in your own Firebase project

1. Complete Feature 3's web-app configuration using your own four environment
   values. Reuse the same Firebase project as Email/Password.
2. Open Firebase Console → Authentication → Sign-in method. Enable **Google**,
   select the project's support email, and save.
3. In Authentication settings, review **Authorized domains**. Include the actual
   development and deployed hosts you use, for example `localhost` and
   `gafursz.github.io`. Enter hostnames, not `/Minigames/` paths or full URLs.
4. For deployment, keep the four matching Vite settings in the existing Actions
   variables. Rebuild after configuration changes. No additional app-session token
   setting or Google client secret belongs in this frontend.
5. Verify actual Google account selection, cancellation, and successful sign-in in
   a browser. Tests with mocked provider calls cannot verify your Console settings.

## Commands explained before use

Follow `START-HERE.md` to import the branch after Feature 4 is integrated.
From the repository root, `npm ci` installs exact lockfile versions, replacing
`node_modules` without changing source. No new Google-specific package is needed.

```bash
npm ci
```

Use your existing ignored `.env.local`; do not overwrite it. If it does not exist,
`cp` copies the example below, and `-n` prevents replacing an existing destination.
Fill the four settings with values from your own Firebase web app.

```bash
cp -n .env.example .env.local
```

`npm run dev` starts Vite. Open its printed URL, including `/Minigames/`. Restart
after changing environment values. Ctrl+C stops the server.

```bash
npm run dev
```

`npm test` runs the existing Vitest suite once. `test:coverage` measures that suite
and enforces the unchanged 80% aggregate statement threshold. `lint` checks ESLint;
`format:check` checks formatting without editing files. `typecheck:tests` checks
TypeScript without emitting JS; `build` writes the production app and SPA fallback
under `dist/`. These checks mock Firebase and public network boundaries.

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

The delivery's `verification.json`, raw logs, and HTML coverage report contain the
measured results. The existing test suite is extended; there is no separate testing
framework or new application-logic exclusion to inflate coverage.

The final run passed **239 tests in 26 files**, with zero failures, skips, or todos.
All **55** non-declaration source TypeScript files are included. Aggregate coverage:
**89.73% statements** (1679/1871), **82.65% branches** (1015/1228), **93.38%
functions** (339/363), and **92.83% lines** (1542/1661). Lint, formatting,
TypeScript checks, and the production build pass. Native browser popup behavior
and real Google account authorization remain manual checks.

## Browser checks after setup

- Try Google from both Login and Registration with the form fields empty.
- Keep the provider popup open: verify pending controls, Escape/backdrop protection,
  and prevention of another request. Cancel and verify recovery without a reload.
- Sign in, inspect the header name/photo fallback and success Snackbar, then reload.
  The stored authentication time must remain unchanged.
- Wait for the same five-minute expiry used by email login. Check guest reset and
  Firebase sign-out. Also verify explicit logout.
- Block popups, retry after allowing them, and check mobile/desktop browsers.

## Remaining work and integration

The ZIP includes full source, exact changed files, an incremental Git bundle, a
guarded importer, a task PR draft, and verification evidence. Import instructions
explain each command before asking you to run it. Nothing was pushed, merged,
deployed, or imported into your Windows folder by this delivery.

Commit identities use `Gafursz <gafurjon.sh@gmail.com>` and actual creation times.
Integrate task PRs into `story-4` in order, preserving their prerequisite commit
identities. Keep the final `story-4` → `story-3` Cross-Check PR unmerged.

The complete authenticated Auth URL/protected-action guards and the favorites,
comment submission, and comment-like mutations remain later features. They are
not implemented by this Google sign-in task.

## References checked on 8 October 2026

- [Official Google OAuth task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-4-google-oauth.md)
- [Firebase Google sign-in documentation](https://firebase.google.com/docs/auth/web/google-signin)
- [Feature 4 session and email flow](04-email-password-auth.md)
