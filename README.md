# 🎮 MiniGames — Story 4

MiniGames is a responsive single-page gaming application developed as part of the **RS School Qualifying Stage**.

The application is built with **TypeScript, Sass, and Vite** without JavaScript or CSS frameworks.

Story 3 public API integration and routing are complete. Story 4 is in progress:
Feature 1 adds Vitest and project-wide coverage. Feature 2 adds real-time Login and
Registration validation. Feature 3 adds the Firebase SDK and configuration foundation.
The real authentication flow and authenticated mutations follow in subsequent task branches.

## 🔗 Links

- [GitHub Repository](https://github.com/Gafursz/Minigames)
- [Live Demo](https://gafursz.github.io/Minigames/)
- [RS School MiniGames Assignment](https://github.com/rolling-scopes-school/qualifying-stage/tree/main/tasks/minigames)
- [Figma Design](https://www.figma.com/design/4MnLizE59gZI2DDxaSgZqi/MiniGames)

## ✨ Features

### Home

- Responsive navigation and mobile menu
- Hero section
- Interactive game carousel with autoplay and swipe support
- Weekly leaderboard
- Developer section
- Responsive footer

### Games Library

- SPA navigation
- Responsive game cards
- Game filtering and sorting
- Pagination
- Game Details dialog
- Game statistics, records, and comments

### Authentication

- Login and registration dialogs
- Login/Register switching
- Password visibility controls
- Real-time field validation, accessible inline errors, and disabled invalid submissions
- Form reset on Login/Register changes, including browser history
- Backdrop and Escape-key dismissal
- Responsive desktop and mobile layouts

## 🛠️ Tech Stack

- TypeScript
- Sass / SCSS
- Vite
- ESLint
- Prettier
- Husky
- Commitlint
- Vitest with V8 coverage and jsdom for DOM tests
- Git & GitHub

No JavaScript or CSS frameworks, or pre-built slider libraries are used.

## 📁 Project Structure

```text
src/
├── app/
├── assets/
├── components/
├── data/
├── features/
│   ├── auth-dialog/
│   ├── game-details/
│   └── slider/
├── pages/
│   ├── home-page.ts
│   └── library-page.ts
├── styles/
├── types/
├── utils/
└── main.ts
```

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/Gafursz/Minigames.git
cd Minigames
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## 📜 Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
```

## 📱 Responsive Design

The application follows the provided Figma design and supports the required responsive layouts at:

- **375px** — mobile
- **768px** — tablet
- **1920px** — desktop

The interface also adapts fluidly between these breakpoints.

## Unit tests and coverage

`npm test` invokes the `test` script (`vitest run`). It runs every unit and DOM
integration suite once and exits with a failing status if an assertion fails.
Tests use mocked network responses and do not need Firebase credentials.

```bash
npm test
```

`npm run test:coverage` runs the same suites with V8 coverage. It prints the full
source-file table and writes an HTML report to `coverage/index.html`. The command
fails when aggregate statement coverage is below 80%. Generated reports are
excluded from Git, ESLint, and Prettier; application logic is included in coverage.

```bash
npm run test:coverage
```

`npm run typecheck:tests` checks the application, TypeScript tests, and test
configuration without emitting JavaScript files. `npm run test:watch` keeps Vitest
running during development and reruns affected tests after edits.

```bash
npm run typecheck:tests
npm run test:watch
```

Feature 1 baseline: **133 passing tests**, **87.42% statements**, **79.95% branches**,
**92.12% functions**, and **90.42% lines** across all 46 non-declaration source
TypeScript files. This is a measured snapshot; rerun coverage as features change.

Read [Feature 1: what changed, how it works, and why](docs/story-4/01-test-foundation.md)
for the migration details, coverage scope, commands, and remaining work.

Feature 2 snapshot: **191 passing tests**, **89% statements**, **81.62% branches**,
**93.15% functions**, and **91.97% lines** across all 48 non-declaration source
TypeScript files. Coverage includes every application-logic file; the same 80%
statement gate remains in place.

Read [Feature 2: validation rules, UI behavior, and tests](docs/story-4/02-auth-validation.md)
for the what/how/why guide and manual review steps. Feature 2 added validation;
Feature 4 now connects valid forms to Firebase as described below.

Read [Feature 3: Firebase setup and configuration](docs/story-4/03-firebase-foundation.md)
to configure your personal Firebase Web app and enable Email/Password. Copy the
provided `.env.example` to an ignored `.env.local` and fill your own project values.
The SDK foundation is ready; personal Console/provider setup and live authentication
verification remain required. The existing deploy workflow reads matching repository
Actions variables. Nothing has been deployed by this feature.

Read [Feature 4: Email/Password flow and the five-minute app session](docs/story-4/04-email-password-auth.md)
for SDK calls, pending controls, retry/success behavior, header state, session expiry,
logout, and the remaining manual checks. Its verification passed **230 tests**, with
**89.70% statements** across all **54** source TypeScript files. Firebase Console
configuration and a live sign-in check are still required; unit tests mock Firebase.
Feature 5 adds Google OAuth. Feature 6 completes Auth dialog guards and game
context recovery; game mutation APIs remain later work.

Read [Feature 5: Google sign-in](docs/story-4/05-google-auth.md) for the popup flow,
cancellation/retry behavior, shared app session, and Firebase Google provider setup.
Its snapshot passes **239 tests**, with **89.73% statements** across all **55** source
TypeScript files. Google provider activation and real browser sign-in are still
required; automated tests mock the provider boundary.

## 🌿 Git Workflow

Development follows the RS School story-based workflow:

Create `story-4` from the completed `story-3` branch. Implement each task or small
related group on a separate feature branch and merge its task PR into `story-4`.

Feature 1 uses `feature/test-foundation` → `story-4`. The final Story 4 Cross-Check
PR targets `story-3` and **must remain unmerged**. Keep the earlier Story 3
Cross-Check PR unmerged too.

Feature 2 uses `feature/auth-validation` → `story-4` and depends on Feature 1.
Its delivery was built from Feature 1's exact tip because that prerequisite had
not yet been integrated on GitHub. Integrate Feature 1 before Feature 2.

Feature 3 uses `feature/firebase-auth`; Feature 4 uses `feature/email-password-auth`.
These are dependent task branches built from the previous feature's exact tip.
Integrate their task PRs into `story-4` in order. No push or PR merge is claimed by
their delivery packages. Keep the final Cross-Check PR unmerged.

Feature 5 uses `feature/google-auth` and depends on Feature 4's original tip.
Import and integrate it after the preceding task PRs; preserve local edits through
Git rather than overwriting your working folder with the complete source snapshot.

Read [Feature 6: Auth guards and session recovery](docs/story-4/06-auth-guards.md)
for URL/history rules, protected action hooks, and verification. Its branch
`feature/auth-guards` depends on Feature 5; integrate the task PRs in order.

## 👨‍💻 Author

**Gafur Sharipov**

GitHub: [@Gafursz](https://github.com/Gafursz)

## 📄 Assignment

Developed for the **RS School Qualifying Stage — MiniGames Story 4**.
