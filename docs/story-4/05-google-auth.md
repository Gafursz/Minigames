# Story 4 — Feature 5: Google sign-in

## Delivery and scope

**Branch:** `feature/google-auth`  
**Prerequisite:** Feature 4 (`6c798eb90fb6cf347637ea9189de08309bdaa509`)

Feature 5 integrates Firebase Google sign-in into the MiniGames application. Users can authenticate from both the Login and Registration views using Firebase's popup flow. Google authentication shares the existing request locks, error feedback, application session controller, profile display, logout, and five-minute session lifetime with Email/Password authentication.

The Google provider has been enabled in the project's Firebase Console, and the relevant development and GitHub Pages hostnames have been authorized. **Real Google sign-in and explicit logout were manually verified.** Google-specific five-minute expiration, reload persistence, and the full range of popup failure scenarios still require separate live-browser verification; their implementation is exercised by automated tests.

Features 1–4 are already integrated into `story-4` at commit `c08151e`. Feature 5 was reconciled with that branch while preserving the prepared feature commits. The Feature 5 task pull request into `story-4` has **not yet** been opened or merged.

## What changed and why

| File                                        | Change and purpose                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/auth/google-auth.ts`                   | Configures `GoogleAuthProvider`, requests account selection, calls Firebase's popup sign-in method, and returns the limited profile data needed by the application. |
| `src/auth/auth-error.ts`                    | Converts common Firebase failures into understandable messages, including cancellation, blocked popups, unauthorized domains, and conflicting providers.            |
| `src/features/auth-dialog/auth-form.ts`     | Provides working Google authentication controls in Login and Registration.                                                                                          |
| `src/features/auth-dialog/auth-dialog.ts`   | Reuses pending, success, and error handling for email and Google requests; Google authentication does not depend on the email form's field validity.                |
| `src/app/app.ts`                            | Reuses session creation and cleanup across providers and allows the Google operation to be injected for tests.                                                      |
| `src/components/header-profile.ts`          | Renders the authenticated name, initials-based avatar, and logout control. Initials use the first and last words of a multiword name.                               |
| `src/styles/components/_header.scss`        | Implements the agreed responsive authenticated header and full-width logout controls in compact navigation.                                                         |
| `src/features/auth-dialog/auth-dialog.scss` | Preserves the corrected authentication input-focus appearance.                                                                                                      |
| `tests/auth/google-auth.test.ts`            | Tests the SDK boundary, account selection, cancellation and retry, missing email, and setup failures.                                                               |
| `tests/auth/auth-flow.test.mjs`             | Tests both auth views, locking, cancellation, session persistence, profile rendering, and URL cleanup using a mocked Google operation.                              |
| `tests/auth/header-profile.test.ts`         | Verifies initials and authenticated profile presentation.                                                                                                           |
| `tests/slider/slider-gestures.test.ts`      | Adds gesture-behavior regression tests.                                                                                                                             |
| `tests/utils/horizontal-drag.test.ts`       | Adds horizontal-drag utility tests.                                                                                                                                 |

No new framework, external routing library, Google-specific dependency, or SCSS convention was introduced. The existing Firebase dependency, session architecture, and styling tokens are reused.

### Responsive header behavior

- **Desktop (above 1024px):** Displays the authenticated user's full name, initials-based avatar, and Log out button in that order. Google profile photographs are not displayed.
- **Tablet (481–1024px):** Keeps Log out and the hamburger control in the top header; hides the name and avatar there. The expanded authenticated menu provides a full-width outlined Log out button.
- **Mobile (480px and below):** Shows the hamburger control in the top header. The expanded authenticated menu contains the full-width outlined Log out button. Guest navigation continues to show the appropriate Login and Sign Up actions.

The header respects the HTML `hidden` state so guest and authenticated controls are not displayed together.

## How Google authentication works

1. The user selects **Continue with Google** or **Sign up with Google**. Invalid or empty Email/Password fields do not prevent this independent action.
2. The authentication dialog enters its pending state. Inputs, switches, submission buttons, and other authentication actions are locked; the dialog displays **Connecting to Google…**. Escape and backdrop dismissal are blocked while the request is pending.
3. The application waits for required identity cleanup, then calls `signInWithGoogle()` using the Firebase initialization shared with Feature 3.
4. `GoogleAuthProvider` requests account selection through `prompt: 'select_account'`. `signInWithPopup()` handles the identity-provider interaction without replacing the SPA route.
5. After successful authentication, only `displayName`, `email`, and the optional `avatarUrl` profile field are returned to the application. OAuth tokens, Firebase access tokens, and passwords are not stored in the application session.
6. The existing application session controller stores the permitted profile fields and successful-authentication timestamp. The header updates, the dialog closes, the `auth` URL state is removed, and a success Snackbar appears. The app-session lifetime remains fixed at five minutes.

If Firebase returns no email, the Google service attempts sign-out and rejects the result rather than constructing an invalid application session. Missing display names use the existing profile fallback behavior. The header uses initials instead of Google profile photographs. Storage failures and late authentication results after application teardown follow the established guest-state cleanup path.

## Error handling and cancellation

Closing the Google popup is treated as cancellation. The application keeps the authentication dialog open, displays an understandable message, preserves entered email-form values, and unlocks controls once Firebase settles the request. It does not automatically retry; the user may try Google again or switch to Email/Password.

Blocked popups, unauthorized domains, and accounts linked to another provider receive explanatory messages rather than raw Firebase errors. Account linking and redirect-based authentication are outside Feature 5's scope.

Firebase initialization and previous sign-out operations can introduce a delay on the first attempt. Closing the popup may also take several seconds to resolve as Firebase detects cancellation. Cross-browser handling of these cases should be checked manually.

## Firebase configuration

Feature 5 uses the existing Firebase project and frontend environment settings established in Feature 3.

1. In **Firebase Console → Authentication → Sign-in method**, enable **Google** and select the project's support email.
2. In **Authentication → Settings → Authorized domains**, include the hostnames used for development and deployment, such as `localhost` and `gafursz.github.io`. Use hostnames rather than full URLs or `/Minigames/` paths.
3. Keep the four matching Vite environment values in the local ignored `.env.local` file and the GitHub Actions configuration used for deployment. Restart or rebuild when environment values change.
4. Do not put a Google client secret, OAuth access token, or application session secret in frontend source code.

Google provider activation, authorized hostname configuration, successful real-account sign-in, and logout were verified locally. A successful deployed-site Google sign-in is **not yet confirmed**.

## Development and verification commands

Run commands from the repository root. These are reference instructions, not operations that have to be repeated solely to read this document.

```bash
npm ci
```

`npm ci` installs the versions pinned by `package-lock.json` and replaces `node_modules`. It does not edit application source files. No extra Google-authentication package is required.

```bash
cp -n .env.example .env.local
```

If `.env.local` does not exist, `cp` copies the template and `-n` avoids overwriting an existing file. Populate the copied file with the Firebase web application's actual public configuration values. Never commit personal secrets or environment files that should remain ignored.

```bash
npm run dev
```

Starts the Vite development server. Visit the URL printed by Vite, including the project's `/Minigames/` base path where applicable. Stop it with Ctrl+C.

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

- `npm test` runs the Vitest suite once.
- `npm run test:coverage` runs the coverage suite and checks the required aggregate statement-coverage threshold of at least 80%.
- `npm run lint` runs ESLint.
- `npm run format:check` checks Prettier formatting without changing files.
- `npm run typecheck:tests` runs TypeScript's test configuration without emitting JavaScript.
- `npm run build` creates the production output in `dist/` and runs the SPA fallback postbuild script.

### Recorded verification results

The latest completed pre-reconciliation coverage run reported **256 passing tests across 28 files**, with **92.32% aggregate statement coverage (1731/1875)**. This exceeds the Story 4 acceptance threshold of 80%.

ESLint, Prettier, TypeScript test checking, production build, and Git whitespace checking also passed after the final UI and test improvements. During the subsequent merge of `story-4` into the feature branch, the Git commit hooks again passed ESLint and Prettier.

**Before opening the Feature 5 pull request, rerun the test and coverage commands on the reconciled branch** so the final verification explicitly covers merge commit `7bfc85e` and any follow-up documentation changes. Automated Firebase interactions use mocks; passing tests do not replace a live Firebase configuration check.

## Browser verification status

**Verified manually:**

- Firebase Google provider enabled and relevant hostnames authorized.
- Successful sign-in using a real Google account.
- Authenticated header populated with the user's display name and initials.
- Explicit logout returning the application to guest state.
- Responsive header behavior reviewed at desktop, tablet, and mobile breakpoints.

**Still requires specific manual verification:**

- Five-minute expiration after Google sign-in, including Firebase sign-out and return to guest state.
- Successful account selection initiated independently from both Login and Registration.
- Reload persistence without extending the initial five-minute session.
- Popup cancellation, delayed error recovery, pending input locks, and retry after cancellation.
- Blocked-popup and unauthorized-domain failure messages in the target browsers.
- Successful authentication on the deployed GitHub Pages site.

## Integration and remaining work

Feature 5 was imported into `feature/google-auth` after Feature 4. The responsive UI and test improvements were committed as `cafaebb` (`fix(auth): align profile UI with Figma and expand tests`). The feature branch was reconciled with the current `story-4` history by merge commit `7bfc85e` (`chore: merge story-4 into google-auth`). Its original feature commits have not been squashed or rebased.

The next steps are to finish documentation verification, run post-merge checks, push `feature/google-auth`, and open a task PR targeting `story-4`. Merge that task PR according to the RS School workflow, preserving commit history. Subsequent features should use their own task branches.

**The final `story-4` → `story-3` Cross-Check pull request must remain unmerged.**

Full authenticated route/action guards, favorites toggling, comment submission, and comment likes belong to later Story 4 features; they are not claimed as part of Feature 5.

## References

- [RS School — Google OAuth task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-4-google-oauth.md)
- [Firebase — Authenticate using Google with JavaScript](https://firebase.google.com/docs/auth/web/google-signin)
- [Feature 4 — Email/Password authentication](04-email-password-auth.md)
