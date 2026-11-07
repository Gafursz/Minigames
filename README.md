# 🎮 MiniGames — User Profile & Achievements

A responsive, framework-free single-page application for discovering games, browsing details, saving favorites, and joining discussions. Built with **TypeScript, Sass, and Vite** for the **RS School Qualifying Stage**.

The **Creative Extension** adds a personal profile with activity statistics, achievements, recent history, and customization.

**Repository:** [Gafursz/Minigames](https://github.com/Gafursz/Minigames) · **Extension branch:** `creative-extension`
**Assignment:** [RS School — MiniGames Creative Extension](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/creative-extension/mini-games.md) · **Design:** [Figma](https://www.figma.com/design/4MnLizE59gZI2DDxaSgZqi/MiniGames)

> **Important:** MiniGames is a game **catalog**, not a platform for playing games. Profile statistics measure catalog interactions such as games explored, favorites added, and comments submitted. They do **not** represent gameplay scores, wins, or playtime.

## Features

### Core application

- Responsive home page, featured games, carousel, and leaderboard
- Games library with API-backed filtering, sorting, and pagination
- Game details with statistics, comments, favorites, and comment likes
- Single-page navigation with browser history and shareable URLs
- Firebase email/password and Google sign-in, with protected account actions

### Creative Extension — Player Profile & Achievements

- **Personal dashboard:** games explored, locally tracked favorites, comments posted, and achievements earned
- **Six achievements:** milestones for exploration, favorites, commenting, and profile customization
- **Recent activity:** up to 50 game views, favorite changes, and successful comments
- **Profile customization:** six avatars, five colors, optional nickname, and short bio
- **Preferences:** reduced motion and achievement notifications
- **Persistent progress:** browser `localStorage`, separated by signed-in account
- **Safe recovery:** saved-data validation, duplicate-view prevention, and confirmation before resetting local progress

The achievement rules are:

| Achievement              | Unlock requirement                   |
| ------------------------ | ------------------------------------ |
| 🔎 First discovery       | Explore one distinct game            |
| 🧭 Curious explorer      | Explore five distinct games          |
| 💛 Game collector        | Have three locally tracked favorites |
| 💬 Join the conversation | Submit one successful comment        |
| 🏅 Trailblazer           | Explore ten distinct games           |
| ✨ Make it yours         | Save a customized profile            |

Achievements unlock only once and remain earned when a milestone's current value later changes.

## Tech stack

**TypeScript · Sass/SCSS · Vite · Firebase Authentication · REST API · Vitest · ESLint · Prettier · GitHub Actions**

The application uses native DOM APIs and a custom SPA router rather than a frontend UI framework.

## Getting started

Use a Node.js version supported by [`package.json`](package.json).

```bash
git clone --branch creative-extension https://github.com/Gafursz/Minigames.git
cd Minigames
npm ci
```

Create your local Firebase configuration from the provided template:

```bash
cp .env.example .env.local
```

Add the **Firebase web-app configuration** for your own project to `.env.local`, and enable the sign-in methods you intend to use in Firebase Authentication. The `.env.local` file is ignored by Git; never commit private keys, service-account credentials, or tokens.

Start development:

```bash
npm run dev
```

Open the address printed by Vite, sign in, and choose **My profile**. The profile route is `/Minigames/profile` with this project's configured base path.

Build for production:

```bash
npm run build
npm run preview
```

## Testing and quality

The most recent local verification of the completed source reported:

- **345/345** Vitest tests passing (34 test files)
- **6/6** focused profile smoke tests passing
- **0** ESLint errors and a passing Prettier check
- A successful TypeScript and Vite production build

Run the checks yourself after cloning:

```bash
npm run lint
npm run format:check
npm run test:profile:smoke
npm test
npm run typecheck:tests
npm run test:coverage
npm run build
```

The separate test type-check and coverage commands are also part of the Creative Extension CI workflow; their results should be checked on the submitted branch.

## Project structure

```text
src/
├── app/app.ts                         # Routing, sessions, activity integration
├── features/profile/player-progress.ts # Profile data and achievement rules
├── pages/profile-page.ts              # Dashboard and settings UI
├── components/header-profile.ts       # Profile display in the header
└── styles/pages/_profile.scss         # Responsive profile styles

tests/creative-extension/              # Profile unit and integration tests
docs/creative-extension/README.md      # Feature architecture and technical guide
```

## Data and limitations

Profile data is saved **locally in the current browser**, using an account-specific storage key. It is not synced across devices, is not a server-verified achievement ledger, and does not automatically include earlier account activity. Browser data can be edited or cleared by the user. Resetting a profile clears its local progress only; it does not delete Firebase accounts or server-side favorites and comments.

For implementation details and manual test cases, see the **[Creative Extension technical guide](docs/creative-extension/README.md)**.

---

**Author:** [@Gafursz](https://github.com/Gafursz)
**Project:** RS School Qualifying Stage — MiniGames
