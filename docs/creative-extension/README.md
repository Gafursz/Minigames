# Creative Extension — Player Profile & Achievements

This document explains **what** was implemented, **why** it was needed, and **how** the feature works. It covers one extension: Player Profile & Achievements.

## 1. Problem and scope

The existing MiniGames application lets users browse a game catalog, save favorites, and submit comments, but it does not give them a personal overview of these activities. The extension adds a profile dashboard and milestone system that reuses the application's existing authentication, routing, and game-detail features.

MiniGames does **not** provide playable game sessions or a gameplay statistics API. Therefore, the new dashboard tracks **catalog interactions**, not playtime, wins, or game scores. This distinction is deliberate.

## 2. What was implemented

### Profile and dashboard

Authenticated users can open **My profile** at `/Minigames/profile`. Guests receive a sign-in prompt. The dashboard displays four statistics:

- **Games explored:** number of distinct game detail pages opened while tracking is active
- **Favorites:** games added to the profile's browser-local favorites tracking
- **Comments:** successful comment submissions observed by the extension
- **Achievements:** number of milestones unlocked

These statistics are not a historical report from the backend. Existing actions performed before the extension was active, or on another browser, are not automatically imported.

### Achievements

| Badge                    | Target             | Progress source                |
| ------------------------ | ------------------ | ------------------------------ |
| 🔎 First discovery       | 1 game explored    | Unique game slugs              |
| 🧭 Curious explorer      | 5 games explored   | Unique game slugs              |
| 💛 Game collector        | 3 favorites        | Locally tracked favorite slugs |
| 💬 Join the conversation | 1 comment          | Confirmed comment count        |
| 🏅 Trailblazer           | 10 games explored  | Unique game slugs              |
| ✨ Make it yours         | Customized profile | Saved profile settings         |

Each achievement has an ID, label, icon, description, target, and function that calculates its progress. The same evaluation logic checks every achievement after relevant changes. Unlock timestamps are stored so a badge cannot unlock twice and remains earned after a favorite is removed.

### Recent activity

The profile records up to **50** recent events, newest first: game-detail views, favorite additions/removals, and confirmed comments. A duplicate view of the same game within **30 seconds** is ignored. The history limit prevents the event log from growing indefinitely; lifetime progress is stored separately.

### Customization and preferences

Users can choose one of six emoji avatars and five accent colors, enter an optional nickname and bio, and configure reduced motion and achievement notifications. Settings are validated before saving. Profile text is safely inserted into the interface.

### Reset and resilience

Reset requires confirmation and clears only the current account's **local profile progress**. It does not delete the Firebase account, server comments, or server favorites. Invalid or corrupted saved JSON falls back to a fresh profile; unavailable browser storage is handled without crashing the page.

## 3. Architecture

The implementation follows the existing TypeScript + DOM + Sass structure without adding a new UI framework or backend.

| File                                      | Responsibility                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `src/features/profile/player-progress.ts` | Data types, achievements, validation, `localStorage`, activity recording, reset |
| `src/pages/profile-page.ts`               | Profile page rendering, activity list, settings form, avatar controls           |
| `src/app/app.ts`                          | Current-user session, profile routing, activity callbacks, UI updates           |
| `src/components/header-profile.ts`        | Saved nickname/avatar displayed in the header                                   |
| `src/features/game-details/`              | Game views and successful favorite/comment events                               |
| `src/styles/pages/_profile.scss`          | Layout, responsive behavior, and motion preferences                             |
| `tests/creative-extension/`               | Progress model, edge cases, and profile integration tests                       |

### Activity flow

```text
User opens game details / performs a favorite or comment action
                         ↓
Existing app receives the event (after server success for mutations)
                         ↓
App verifies the current session and calls PlayerProgress.record()
                         ↓
Model updates stats and bounded history
                         ↓
Achievement rules are checked; new unlocks get timestamps
                         ↓
Profile data is saved in browser localStorage
                         ↓
Dashboard and optional notifications refresh
```

### Data-driven achievements

For example, the Trailblazer milestone uses the number of distinct explored game slugs:

```ts
{
  id: 'trailblazer',
  icon: '🏅',
  name: 'Trailblazer',
  description: 'Explore ten different games.',
  target: 10,
  progress: (data) => data.explored.length,
}
```

The model loops through the same `ACHIEVEMENTS` collection rather than implementing six unrelated unlock handlers. This keeps milestone rules easy to read and extend.

### Local data model

Each authenticated account uses a normalized email-based storage key. Saved data contains a schema version, settings, explored slugs, favorite slugs, comment count, recent history, and achievement unlock timestamps.

On load, the model checks field types, valid slugs, supported settings, timestamps, list limits, and known badge IDs. If data fails validation, it resets the local profile to a safe default. Errors from browser storage are caught and reported through the model's persistence state.

**Privacy/security limitation:** `localStorage` is readable and editable from browser developer tools. Per-account keys separate profiles in the same browser but are not access control or secure storage. No cross-device synchronization or backend achievement verification is implemented.

## 4. Important edge cases

- Exploring the same game repeatedly counts as **one unique discovery**.
- A quick repeated view of the same game does not create duplicate recent activity.
- A failed favorite or comment API request does not award progress for a successful action.
- An achievement unlocks once, even after subsequent refreshes or qualifying actions.
- Recent history is limited to 50 events without resetting lifetime progress.
- Switching accounts loads different locally saved profiles.
- Corrupted saved data and inaccessible storage do not crash the application.
- Resetting profile progress does not delete server-side account data.

## 5. Run and verify

Use the Node.js version range supported by the root [`package.json`](../../package.json). From the repository root:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your own Firebase **web app** settings and configure the required authentication providers. This file is ignored by Git.

Automated checks:

```bash
npm run lint
npm run format:check
npm run test:profile:smoke
npm test
npm run typecheck:tests
npm run test:coverage
npm run build
```

The latest verified completed-source run had **345 passing Vitest tests**, **6 passing profile smoke tests**, clean lint/format checks, and a successful production build. Test type-checking and coverage are separately enforced by the GitHub Actions workflow; check those results for the submitted branch.

### Manual testing checklist

1. Sign in and open **My profile**; sign out and check the guest state.
2. Open a new game detail page and check its entry in profile activity.
3. Visit five distinct games and verify the Explorer progress/unlock.
4. Add favorites and submit a successful comment; verify the related progress.
5. Change avatar, color, nickname, or bio; save and refresh the page.
6. Verify reset **Cancel** leaves data unchanged; use **Confirm** only when intentional.
7. Check the page at phone and desktop widths, including keyboard navigation.
8. If available, switch between two test accounts to check profile separation.

## 6. Design decisions and future work

The extension reuses the project's existing TypeScript classes, custom routing, Firebase authentication, and game-detail callbacks. Browser-local persistence keeps the scope manageable and avoids introducing a new server requirement for a catalog-only feature.

A later version could sync progress through an authenticated backend and track actual gameplay outcomes **if** a real gameplay API becomes available. Those capabilities are not part of this extension.
