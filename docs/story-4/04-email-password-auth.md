# Story 4 — Feature 4: Email/Password Authentication

## Overview

Feature 4 integrates Firebase Email/Password authentication into MiniGames and introduces five-minute application-session management.

It connects the existing validated Login and Registration forms to Firebase, manages authentication requests, and updates the application interface according to the user's session state.

| Item                   | Details                                          |
| ---------------------- | ------------------------------------------------ |
| Branch                 | `feature/email-password-auth`                    |
| Latest prepared commit | `6c798eb`                                        |
| Status                 | Implemented; automated checks passed             |
| Remaining verification | Live Firebase authentication and session testing |
| Pull request           | Not yet created                                  |

## Implementation

The feature introduces:

- Firebase Email/Password registration and login.
- Firebase profile updates with the registration username.
- Authentication error handling and retry support.
- Input and dialog locking during pending authentication requests.
- Five-minute application sessions stored in localStorage.
- Session restoration, expiration, and logout.
- Authenticated profile display in desktop and mobile headers.
- Snackbar notifications for authentication results and session expiration.
- Protection against duplicate requests and outdated asynchronous responses.

Existing form validation, SPA routing, and public REST API functionality are preserved.

## Files and Responsibilities

| File                                               | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `src/auth/email-auth.ts`                           | Firebase registration, login, profile updates, and sign-out  |
| `src/auth/app-session.ts`                          | Session persistence, validation, expiration, and cleanup     |
| `src/auth/auth-error.ts`                           | User-friendly authentication error messages                  |
| `src/features/auth-dialog/auth-dialog.ts`          | Authentication requests, pending states, and dialog behavior |
| `src/features/auth-dialog/auth-form-validation.ts` | Form values and pending-state controls                       |
| `src/app/app.ts`                                   | Authentication integration, session checks, and logout       |
| `src/components/header-profile.ts`                 | Authenticated profile names, initials, and avatars           |
| `src/components/header.ts`                         | Profile integration and avatar fallback                      |
| `src/features/auth-dialog/auth-dialog.scss`        | Disabled controls and corrected Figma input focus styling    |
| `src/styles/`                                      | Shared tokens and responsive profile styling                 |
| `tests/auth/`                                      | Authentication, session, error-handling, and profile tests   |

## Authentication Flow

The existing Feature 2 validation rules run before authentication.

When a valid form is submitted:

1. The form captures the current input values and locks authentication controls.
2. Login calls Firebase `signInWithEmailAndPassword()`.
3. Registration calls `createUserWithEmailAndPassword()` and saves the username using `updateProfile()`.
4. Successful authentication creates the five-minute MiniGames application session.
5. The header displays the authenticated profile, the dialog closes, and a success notification appears.

If authentication fails, the dialog remains open, controls are unlocked, and an error message is displayed. The user can correct the input or retry.

Pending requests cannot be dismissed through Escape, the backdrop, or authentication mode switching.

Authentication results are handled safely to prevent outdated requests from updating destroyed views.

## Application Session

Firebase authentication and the MiniGames application session are managed separately.

The application stores the following session information in localStorage:

- Display name.
- Email address.
- Authentication timestamp.
- Optional avatar URL.

Passwords, Firebase authentication tokens, and user credentials are not stored in the application-session record.

The session expires exactly **five minutes after successful authentication**.

Reloading the page or navigating within the application does not extend its lifetime.

Session validity is checked during application startup, navigation, and relevant browser events.

When the session expires or the user logs out, the application clears its session state, returns the interface to Guest Mode, and requests Firebase sign-out.

The client-side session controls the application's UI state; it is not a substitute for server-side authentication security.

## Authenticated Header

The desktop and mobile headers display the authenticated user's profile.

The profile supports a display name, generated initials, and an optional avatar.

Profile names are rendered safely as text. If an avatar cannot load, the interface falls back to initials.

Long names are visually constrained to preserve the responsive header layout.

## Figma Styling Correction

During local browser review, the previous yellow input-focus shadow was found in the prepared Feature 4 stylesheet.

The approved Feature 2 styling was restored by replacing the focus shadow with the existing surface background color.

Feature 4's disabled-control styling and hover restrictions were preserved.

## Automated Testing

Feature 4 added 29 tests covering Firebase authentication, application sessions, error handling, authenticated headers, and dialog behavior.

The existing Story 3 and earlier Story 4 tests were retained.

### Local Verification Results

| Metric                      |         Result |
| --------------------------- | -------------: |
| Test files                  |  **25 passed** |
| Tests                       | **230 passed** |
| Statement coverage          |     **89.70%** |
| Branch coverage             |         82.47% |
| Function coverage           |         93.27% |
| Line coverage               |         92.73% |
| Required statement coverage |            80% |
| ESLint                      |         Passed |
| Prettier                    |         Passed |
| TypeScript checks           |         Passed |
| Production build            |         Passed |

Coverage includes all 54 non-declaration application TypeScript files.

The original 80% aggregate statement coverage requirement remains enforced.

The 230 automated tests were rerun successfully after the documentation reconciliation and SCSS correction. The reported coverage figures were measured before those non-TypeScript corrections.

## Verification Commands

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

These commands verify application behavior, coverage, code quality, TypeScript correctness, and production readiness.

## Git Integration

Feature 4 was imported with its original three commits preserved:

| Commit    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| `77b6cb0` | Add email authentication and five-minute application session |
| `7982003` | Integrate authentication with the dialog and header          |
| `6c798eb` | Document the authentication flow and verification            |

The feature is based on the completed Firebase foundation from Feature 3.

The latest Feature 1–3 documentation was restored from `story-4`, and the Figma focus correction was reapplied.

These reconciliation changes remain to be committed before opening the Feature 4 pull request.

## Remaining Work

Live Firebase verification is required to confirm registration, login, failure handling, logout, and five-minute session expiration against the configured Firebase project.

Google OAuth, complete authentication guards, authenticated favorites, comment submission, and comment likes are outside Feature 4's scope.

The final `story-4` → `story-3` Cross-Check pull request must remain unmerged.

## References

- [Email/Password authentication task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-2-auth-registration-api.md)
- [Application session task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-3-2-session-persistence-expiration.md)
- [Firebase Email/Password documentation](https://firebase.google.com/docs/auth/web/password-auth)
