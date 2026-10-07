# Story 4 — Feature 3: Firebase foundation

## What is ready

Branch: `feature/firebase-auth`, based on Feature 2 commit
`3ad65e95841a3cfb5acf1efd08b0753832f2413f`. Feature 2 must be integrated into
`story-4` before this dependent task branch is integrated.

Firebase **12.19.0** is installed as an exact runtime dependency. The app has typed
web configuration, reusable SDK initialization, explicit Firebase persistence, and
build-time configuration wiring for the existing GitHub Pages workflow. It keeps
the TypeScript/SCSS architecture and adds no UI framework or router.

**Your personal Firebase Console setup is still required.** No Firebase web-app
settings were present in the supplied project. This delivery does not claim to
have created your personal cloud project, enabled its Email/Password provider, or
verified a live sign-in. Complete the setup below before treating the 50-point
Firebase task as fully verified. Feature 4 connects the forms to these SDK methods.

## What changed and why

| File                                 | Purpose                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`  | Install and pin the official Firebase SDK. It is needed at runtime, unlike Vitest.                                              |
| `.env.example`                       | List the four public web settings without inventing project values. Local `.env.local` stays ignored by the existing Git rules. |
| `src/vite-env.d.ts`                  | Give the four Vite environment variables explicit optional string types.                                                        |
| `src/auth/firebase-config.ts`        | Map and check settings before calling Firebase, with a recognizable configuration error.                                        |
| `src/auth/firebase-client.ts`        | Reuse one named Firebase app and one initialization operation; recover from failed initialization so a retry remains possible.  |
| `src/main.ts`                        | Start SDK preparation without blocking Home/Library if configuration or storage is unavailable.                                 |
| `.github/workflows/deploy.yml`       | Pass the four repository variables to the Vite build. Deployment triggers are unchanged; nothing was deployed by this work.     |
| `tests/auth/firebase-config.test.ts` | Check mapping and every missing/blank required setting.                                                                         |
| `tests/auth/firebase-client.test.ts` | Check one-time initialization, named-app reuse, readiness, failed-setup retry, and public-page startup behavior.                |

## How initialization works

`getFirebaseAuth()` reads the web settings, reuses or initializes the app named
`minigames`, obtains its Auth instance, selects `browserLocalPersistence`, and waits
for `authStateReady()`. Concurrent callers share the underlying initialization.
If setup fails, the cached attempt is cleared so a later call can try again.

This matters even for immediate failures: a missing setting can reject before the
SDK makes an asynchronous request. The client clears the cached failure only after
the attempt has been assigned. A test changes missing configuration to valid test
configuration and verifies that the next call succeeds.

Startup uses `prepareFirebaseAuth()`, which handles initialization failure so public
pages remain available. A subsequent authentication request still receives the
error and can show user feedback; it is not converted into successful authentication.

Firebase persistence and the MiniGames five-minute app session are separate. Firebase
remembers identity according to its provider settings. Feature 4's app-session state
decides whether the UI is authenticated, and expiry/logout must also call Firebase
`signOut`. Reading Firebase's `currentUser` alone must never create a fresh app session.

## Complete your personal Firebase setup

1. Open [Firebase Console](https://console.firebase.google.com/) using your account.
   Create a personal project, or choose your existing MiniGames project. A database,
   Firebase Hosting deployment, or Analytics integration is not required for this
   authentication feature.
2. In Project settings → General, register a **Web** app and open its SDK configuration.
   Copy `apiKey`, `authDomain`, `projectId`, and `appId` into the matching environment
   variables below. Use your real values; the ZIP intentionally supplies none.
3. In Authentication → Sign-in method, enable **Email/Password** and save. Email-link
   sign-in is a separate option and is not used here.
4. Review Authentication → Settings → Authorized domains for your development and
   deployed hosts. Use hostnames, not URL paths. Add the actual hosts you use, such
   as `localhost` and `gafursz.github.io`, when needed.
5. Complete a real registration/login smoke check with Feature 4. Confirm that a
   registration creates a Firebase user and saves the username as `displayName`.

| Firebase web property | Environment variable        |
| --------------------- | --------------------------- |
| `apiKey`              | `VITE_FIREBASE_API_KEY`     |
| `authDomain`          | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId`           | `VITE_FIREBASE_PROJECT_ID`  |
| `appId`               | `VITE_FIREBASE_APP_ID`      |

These are client web-app settings and will be present in the browser build. They
are not an Admin SDK service-account credential. Never put service-account keys,
passwords, or Firebase user tokens in these variables or in the app-session object.

## Local configuration commands

Run commands from the repository root after importing this branch. `npm ci` installs
the exact lockfile dependencies and replaces `node_modules`; it does not edit source
or upgrade packages. The new Firebase dependency is included in that installation.

```bash
npm ci
```

If `.env.local` does not already exist, `cp` copies the template. `-n` means
no-clobber: it does not overwrite an existing destination. The source is
`.env.example`, and the destination is your ignored local configuration file.

```bash
cp -n .env.example .env.local
```

Open `.env.local` in your editor and fill the four values using the mapping above.
Do not delete an existing configuration. `npm run dev` starts Vite. Restart it after
environment changes because Vite reads these settings when the server starts.
Open the URL it prints, including the configured `/Minigames/` path. Ctrl+C stops it.

```bash
npm run dev
```

For the existing GitHub Pages workflow, add the same four values as repository
**Actions variables** (Settings → Secrets and variables → Actions → Variables).
The workflow now forwards them to the build. A deployed build must be rebuilt after
changing variables; an old bundle cannot pick up new settings at runtime. No remote
repository settings or deployment triggers were changed by the assistant.

## Tests and verification

The ten new cases extend the existing Vitest suite. Firebase modules are mocked at
the SDK boundary, so unit tests need no cloud project or real credentials. These
tests verify our configuration and lifecycle behavior; they do not prove a personal
Firebase project exists or that its provider has been enabled.

The full run for this feature passed **201 tests in 20 files**, with **89.12%
statement coverage** across all **50** non-declaration application TypeScript files.
There are no failed, skipped, or todo cases. The existing 80% aggregate statement
gate is unchanged, and no application files were excluded. Raw logs, metrics, and
the HTML report are included in the ZIP.

`npm test` runs the suite once. `test:coverage` measures the same suite and enforces
the statement gate. `lint` checks ESLint; `format:check` checks Prettier without
rewriting files. `typecheck:tests` runs TypeScript checks without JS output. `build`
checks app types and creates the Vite production files and SPA fallback under `dist/`.
These checks do not perform a live Firebase login or change cloud settings.

```bash
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

## Integration and remaining work

Use the ZIP's guarded importer and task PR draft. Integrate prerequisite task PRs
in order: Feature 1, Feature 2, then this feature. This branch was not pushed or
merged, and your Windows checkout was not changed. The final `story-4` → `story-3`
Cross-Check PR remains unmerged.

Feature 4 implements real Email/Password operations, pending controls, error/success
feedback, and the app session required by its success criteria. Google OAuth and
authenticated game mutations remain separate later work.

## References checked on 7 October 2026

- [Official Firebase setup task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-3-firebase-auth-setup.md)
- [Firebase web setup](https://firebase.google.com/docs/web/setup)
- [Firebase Email/Password authentication](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
