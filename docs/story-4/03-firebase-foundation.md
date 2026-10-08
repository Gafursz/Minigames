# Story 4 — Feature 3: Firebase Authentication Foundation

## 1. Feature overview

Feature 3 introduced the Firebase Authentication SDK and web configuration into the MiniGames application.

The implementation was developed on `feature/firebase-auth`, building on Feature 2 (`feature/auth-validation`).

The objective was to establish a reusable Firebase authentication foundation while preserving the existing TypeScript, SCSS, Vite, and custom SPA routing architecture.

Firebase version **12.19.0** was installed as an exact runtime dependency.

**Implementation status:** Completed and locally verified.

**Cloud configuration status:** Firebase project and Email/Password provider configured.

**Integration status:** Feature branch pushed to GitHub; integration into `story-4` pending PR merge.

Real Email/Password registration and login are outside the scope of this feature and will be implemented in Feature 4.

## 2. Completed implementation

The following changes were implemented:

- Installed and configured the official Firebase SDK.
- Added strongly typed Firebase environment variables.
- Implemented configuration validation.
- Created reusable Firebase application and authentication initialization.
- Configured Firebase browser-local persistence.
- Implemented initialization recovery after failures.
- Integrated Firebase initialization into application startup without blocking public pages.
- Updated the GitHub Pages workflow to support Firebase environment variables.
- Added automated tests for Firebase configuration and initialization behavior.
- Documented the Firebase configuration and application lifecycle.

No additional frontend framework or external routing library was introduced.

## 3. Files created and modified

| File                                 | Implementation and purpose                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `package.json`, `package-lock.json`  | Added and pinned Firebase SDK 12.19.0.                                                     |
| `.env.example`                       | Documented the four required public Firebase web configuration variables.                  |
| `src/vite-env.d.ts`                  | Added TypeScript definitions for Firebase environment variables.                           |
| `src/auth/firebase-config.ts`        | Implemented configuration mapping and required-value validation.                           |
| `src/auth/firebase-client.ts`        | Implemented reusable Firebase app/Auth initialization, persistence, and recovery behavior. |
| `src/main.ts`                        | Integrated non-blocking Firebase initialization into application startup.                  |
| `.github/workflows/deploy.yml`       | Connected GitHub Actions repository variables to the production build.                     |
| `tests/auth/firebase-config.test.ts` | Added configuration validation tests.                                                      |
| `tests/auth/firebase-client.test.ts` | Added initialization and lifecycle tests.                                                  |
| `README.md`                          | Updated project documentation to reflect the Firebase foundation.                          |

## 4. How Firebase initialization works

The application's Firebase initialization is managed by `getFirebaseAuth()`.

This function:

1. Reads the Firebase web configuration.
2. Validates the required configuration values.
3. Reuses or initializes the named Firebase application `minigames`.
4. Obtains the Firebase Auth instance.
5. Configures `browserLocalPersistence`.
6. Waits for `authStateReady()`.
7. Reuses the same initialization attempt when multiple callers request Firebase Auth.

If initialization fails, the cached attempt is cleared so that a later request can retry.

This prevents a failed initialization from permanently blocking subsequent authentication attempts.

The application also uses `prepareFirebaseAuth()` during startup. It handles initialization failures so that public sections such as Home and Library can remain available even when Firebase is unavailable.

### Firebase authentication versus application session

Firebase identity persistence and the MiniGames application session are separate responsibilities.

Firebase manages the underlying authentication identity.

The MiniGames application session determines whether the interface should treat the visitor as authenticated.

Story 4 requires a five-minute client application session that must not be extended by page activity or reloads.

The application-session functionality, expiration handling, and corresponding sign-out behavior belong to subsequent authentication implementation work.

Firebase `currentUser` alone must not automatically create a fresh application session.

## 5. Firebase project configuration

A personal Firebase project named **MiniGames** was created, and a Web App was registered.

The following Firebase Console configuration was completed:

- Firebase Web App registration.
- Email/Password sign-in provider enabled.
- Passwordless Email Link provider left disabled.
- Local development domain `localhost` authorized.
- GitHub Pages domain `gafursz.github.io` authorized.
- Firebase default authentication domains retained.

Firestore, Realtime Database, Firebase Hosting, and Analytics were not required for this feature.

### Environment variables

The application uses four Firebase web configuration values:

| Firebase property | Environment variable        |
| ----------------- | --------------------------- |
| `apiKey`          | `VITE_FIREBASE_API_KEY`     |
| `authDomain`      | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId`       | `VITE_FIREBASE_PROJECT_ID`  |
| `appId`           | `VITE_FIREBASE_APP_ID`      |

The configuration was added locally to `.env.local`, which is ignored by Git.

The four corresponding GitHub Actions repository variables were also created for the GitHub Pages production build.

Firebase client configuration values are not Firebase Admin service-account credentials. No service-account private keys, passwords, or user authentication tokens were added to the repository.

## 6. Testing and verification

Feature 3 extended the existing Vitest suite with ten Firebase-specific tests.

The test suite covers:

- Required Firebase configuration values.
- Missing and blank configuration values.
- Configuration mapping.
- Reusable Firebase initialization.
- Named Firebase application reuse.
- Authentication readiness.
- Initialization failure and retry.
- Public application startup behavior.

Firebase SDK boundaries are mocked in unit tests. These tests verify application logic but do not establish that real account registration or login succeeds.

### Verified local results

| Metric                                |                   Result |
| ------------------------------------- | -----------------------: |
| Test files                            |                20 passed |
| Tests                                 |               201 passed |
| Failed tests                          |                        0 |
| Statement coverage                    | **89.12% (1,418/1,591)** |
| Branch coverage                       |       81.65% (850/1,041) |
| Function coverage                     |         93.33% (294/315) |
| Line coverage                         |     92.03% (1,294/1,406) |
| Application TypeScript files included |                       50 |
| Required statement coverage           |                      80% |

The Feature 3 implementation exceeded the Story 4 aggregate statement coverage requirement.

No executable application logic was deliberately excluded to increase coverage.

### Additional verification

The following checks completed successfully:

- `npm ci` — dependency installation.
- `npm test` — automated test execution.
- `npm run test:coverage` — coverage measurement.
- `npm run lint` — ESLint verification.
- `npm run format:check` — Prettier verification.
- `npm run typecheck:tests` — TypeScript verification.
- `npm run build` — production build generation.

The application was also opened locally with its Firebase environment configuration, and no Firebase-related browser console errors were observed during the smoke check.

Dependency installation reported five high-severity npm audit findings. These have not yet been remediated and should be reviewed separately.

## 7. Git history and integration

The implementation was prepared with preserved Git commit history and imported into the existing MiniGames repository.

- **Feature branch:** `feature/firebase-auth`
- **Base feature commit:** `3ad65e95841a3cfb5acf1efd08b0753832f2413f`
- **Prepared feature tip:** `9d95d82f4633b5d3ce81b765c935d2ce568493c1`
- **Git author:** `Gafursz`
- **Remote repository:** `Gafursz/Minigames`
- **Target integration branch:** `story-4`

The feature branch was pushed successfully to GitHub after ESLint and Prettier checks passed.

The task pull request is to be merged into `story-4` while preserving the original feature commits.

The final Story 4 Cross-Check pull request targeting `story-3` must remain unmerged.

## 8. Scope boundaries and remaining work

Feature 3 establishes Firebase configuration and initialization. It does not implement the complete authentication experience.

The following functionality remains outside this feature's scope:

- Real Email/Password account registration and login.
- Saving the registration username as the Firebase `displayName`.
- Authentication request pending states and input locking.
- Firebase authentication success and failure feedback.
- Five-minute application-session management.
- Google OAuth sign-in.
- Authenticated user profile and logout interface.
- Authenticated favorites, comments, and comment likes.

The implementation and verification of these functions belong to later Story 4 features.

The deployed GitHub Pages build also needs verification after the updated integration branch is published.

## 9. References

- [RS School Firebase Authentication Setup](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-3-firebase-auth-setup.md)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Firebase Email/Password Authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase Authentication Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
