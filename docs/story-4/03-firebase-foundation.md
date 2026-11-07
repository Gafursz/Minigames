# Story 4 — Feature 3: Firebase Authentication Foundation

## Overview

Feature 3 established the Firebase Authentication foundation for MiniGames Story 4, enabling the application to initialize and reuse Firebase services.

The implementation preserves the existing TypeScript, Vite, SCSS, and custom SPA routing architecture.

| Item         | Details                                             |
| ------------ | --------------------------------------------------- |
| Branch       | `feature/firebase-auth`                             |
| Pull request | [#18](https://github.com/Gafursz/Minigames/pull/18) |
| Merge commit | `448240b`                                           |
| Status       | Completed and merged                                |

## Implementation

The feature introduced:

- Firebase SDK 12.19.0 as an exact runtime dependency.
- TypeScript definitions for Firebase environment variables.
- Configuration validation for required Firebase values.
- Reusable Firebase application and authentication initialization.
- Browser-local Firebase authentication persistence.
- Initialization failure handling and retry support.
- Non-blocking Firebase initialization during application startup.
- GitHub Actions variables for Firebase configuration during deployment.
- Automated tests for Firebase configuration and initialization.

Firebase initialization is managed through `getFirebaseAuth()`, which validates configuration, reuses the named `minigames` application, initializes Firebase Auth, configures persistence, and waits for authentication readiness.

Concurrent initialization requests reuse the same operation. Failed initialization attempts can be retried.

Public application pages remain available when Firebase initialization fails.

## Files and Responsibilities

| File                                 | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `src/auth/firebase-config.ts`        | Firebase configuration mapping and validation      |
| `src/auth/firebase-client.ts`        | Firebase initialization, persistence, and recovery |
| `src/vite-env.d.ts`                  | TypeScript definitions for environment variables   |
| `src/main.ts`                        | Non-blocking Firebase startup initialization       |
| `.env.example`                       | Firebase environment configuration template        |
| `.github/workflows/deploy.yml`       | Firebase variables in the GitHub Pages build       |
| `tests/auth/firebase-config.test.ts` | Configuration validation tests                     |
| `tests/auth/firebase-client.test.ts` | Initialization and lifecycle tests                 |
| `package.json`                       | Firebase SDK dependency                            |

## Firebase Configuration

A Firebase project and Web App were configured for MiniGames.

The following setup was completed:

- Email/Password authentication enabled.
- Email Link authentication left disabled.
- `localhost` authorized for development.
- `gafursz.github.io` authorized for GitHub Pages.
- Firebase default authentication domains retained.

The application uses four environment variables:

| Environment variable        | Purpose                     |
| --------------------------- | --------------------------- |
| `VITE_FIREBASE_API_KEY`     | Firebase web API key        |
| `VITE_FIREBASE_AUTH_DOMAIN` | Authentication domain       |
| `VITE_FIREBASE_PROJECT_ID`  | Firebase project identifier |
| `VITE_FIREBASE_APP_ID`      | Firebase Web App identifier |

Local configuration is stored in Git-ignored `.env.local`.

Matching GitHub Actions repository variables were created for deployment.

No Firebase Admin credentials, private keys, passwords, or user authentication tokens were committed.

## Authentication Architecture

Firebase authentication and the MiniGames application session have separate responsibilities.

Firebase manages the underlying user identity and authentication persistence.

The MiniGames application session determines whether the application interface treats a user as authenticated.

Feature 3 established the Firebase client foundation. The five-minute application session and Email/Password authentication flow were subsequently implemented in Feature 4.

The Firebase identity alone does not automatically create or extend the MiniGames application session.

## Testing and Verification

Feature 3 added ten Firebase-related tests covering configuration validation, initialization, application reuse, authentication readiness, and failure recovery.

Firebase SDK boundaries were mocked during unit testing.

### Feature 3 Verification Results

| Metric                                |         Result |
| ------------------------------------- | -------------: |
| Test files                            |  **20 passed** |
| Tests                                 | **201 passed** |
| Statement coverage                    |     **89.12%** |
| Branch coverage                       |         81.65% |
| Function coverage                     |         93.33% |
| Line coverage                         |         92.03% |
| Application TypeScript files included |             50 |
| Required statement coverage           |            80% |

The implementation exceeded the required 80% aggregate statement coverage threshold without excluding executable application logic.

The following checks passed:

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

The application also loaded locally with Firebase configuration present and no observed Firebase-related browser console errors.

The automated tests did not establish successful live account registration or login. Those interactions require browser verification against the configured Firebase project.

Dependency installation reported five high-severity npm audit findings, which remain subject to separate review.

## Git Integration

Feature 3 was developed on `feature/firebase-auth` and integrated into `story-4` through **PR #18**.

The original feature commits were preserved, including:

`2ad9c70 docs(auth): record completed Firebase foundation setup`

**Merge commit:** `448240b`

The implementation was integrated without introducing an external UI framework or routing library.

## Completion

Feature 3 completed the Firebase configuration and initialization foundation.

Real Email/Password authentication, five-minute application sessions, authenticated header behavior, and logout functionality were implemented in the subsequent Feature 4 code.

Google OAuth, complete authentication guards, favorites, and comment interactions remain outside Feature 3's scope.

The final `story-4` → `story-3` Cross-Check pull request must remain unmerged.

## References

- [RS School Firebase Authentication Setup](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-3-firebase-auth-setup.md)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Firebase Email/Password Authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase Authentication Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
