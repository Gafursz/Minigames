# Story 4 — Feature 7: Favorites API

Feature 7 implements the 15-point Add / Remove Favorites task on
`feature/favorites-api`, based on Feature 6 tip
`7b0c7af1f589f55e52a221182bc53fed3c358965`.
Integrate Feature 6 into `story-4` before importing this dependent branch.

## What users can do

Signed-in users can add or remove a favorite in Game Details. The initial state,
heart icon, button text, and updated likes count come from the backend. Guests
instead see Auth and a sign-in Snackbar, keeping the underlying game context.
The action is never automatically repeated after login.

While a request is pending, the button is disabled, displays `Loading…`, and has
`aria-busy="true"`. Success updates its accessible label, `aria-pressed`, icon,
and count. Failure leaves the last confirmed state visible with error feedback.

## How the API works

| Operation                         | Request                                                                           | Response used                                  |
| --------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| Open authenticated Game Details   | `GET /api/games/{slug}?userEmail={email}`                                         | `data.isLikedByCurrentUser`, `data.likesCount` |
| Add or remove a favorite          | `POST /api/games/{slug}/favorite`, JSON `{ "userEmail": "active-session-email" }` | `data.isFavorited`, `data.likesCount`          |
| Recover after an uncertain toggle | Explicit retry sends the personalized GET                                         | Current server state; no automatic POST        |

The email comes from the active app session, not an input or hardcoded account.
URLSearchParams encodes the email. The POST uses JSON content type and no bearer
token because the assignment backend does not validate Firebase tokens. These
frontend guards are not a backend security boundary.

The endpoint toggles state. Retrying a POST automatically could undo a successful
request whose response was lost. For this reason, a failure changes the button to
`Retry favorite status`. Clicking it performs only a GET. After reconciliation,
a separate click can request a new toggle. No optimistic count changes are made.

## Code changes and their purpose

- `http-client.ts` shares response/error handling between GET and JSON POST.
  It preserves abort behavior and never retries requests automatically.
- `minigames-api.ts` accepts an optional email for Game Details and provides the
  typed toggle operation. It rejects malformed toggle responses before UI updates.
- `favorite-control.ts` owns the favorite button's state, event listener, request
  cancellation, loading state, success/error feedback, and explicit reconciliation.
- `game-details.ts` passes the session profile to the controller and includes the
  email in its initial request. A session change refreshes only favorite state;
  it does not replace the comment draft or Game Details content.
- `app.ts` passes the existing session guard's profile instead of reducing it to
  a boolean. The same guard still opens Auth for expired or guest sessions.
- `game-info.ts` removes the old local-only click toggle. Its HTML layout remains.
- `game-stats.ts` marks the numeric likes text so it can be updated without
  replacing the surrounding icon or accessible label.

No framework, third-party router, new dependency, or SCSS convention is introduced.
The existing disabled styles and design tokens are retained, including your focus
styling from `e82722b`. Earlier documentation refinements remain in the source.

## Session changes and cleanup

Each request captures its game and email. Logout, expiration, user changes, closing
Game Details, and teardown abort the pending request and invalidate its UI result.
A late response cannot update another user's or another game's favorite control.
An abort cannot guarantee the server did not process a POST; the next personalized
GET obtains the authoritative state. There is no compensating automatic POST.

After login while a game is suspended behind Auth, a personalized GET refreshes
favorite state. The draft and scroll are preserved by Feature 6. No favorite is
added automatically. Public Game Details still works for guests.

## Verification

The existing Vitest suite is extended with tests for the encoded email query,
POST method/body/headers, response validation, initial state, duplicate prevention,
loading accessibility, add/remove confirmation, counts, guest/session guards,
ambiguous failure reconciliation, failed GET retry, and stale responses after
logout, teardown, or account changes. Firebase and network boundaries are mocked.

**266 tests pass in 28 test files, with 91.28% aggregate statement coverage across
all 56 application TypeScript files.** Lint, formatting, typechecks, and build pass.
Final counts and full logs are included in `verification.json`, `verification/`,
and `coverage-report/`. All application TypeScript files remain in coverage, with
the existing aggregate 80% statement gate. No dummy tests or application-logic
exclusions were added.

To repeat verification after importing: `npm ci` installs lockfile dependencies
and replaces `node_modules`; `npm test` runs the suite once; `test:coverage` measures
coverage and checks its gate. `lint` checks ESLint, `format:check` checks Prettier,
and `typecheck:tests` checks types without emitting files. `build` writes production
output and the SPA fallback to `dist`.

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run format:check
npm run typecheck:tests
npm run build
```

## Manual checks and remaining scope

With your existing Firebase configuration and real browser:

1. As a guest, click a favorite control. Confirm Auth and the warning appear.
   Cancel Auth and verify the game and draft remain.
2. Sign in and open a game. Confirm the details GET contains your encoded email
   and the favorite state matches the server response.
3. Add/remove the favorite. Confirm one POST per click, the pending lock, and
   server-confirmed icon, text, and likes count. Reopen to verify persistence.
4. Simulate a network failure. Confirm no automatic retry; explicit status retry
   sends GET. Restore the connection and verify reconciliation.
5. Logout or let the five-minute session expire during a pending request. Confirm
   guest state remains and a late response does not restore authenticated UI.

This run did not mutate the live backend, create accounts, verify live Firebase,
push branches, merge PRs, import Windows files, or deploy. Native browser and live
provider/backend checks remain for the configured app. Comment submission, avatar
styling, and comment likes are later features and were not implemented here.

Use the package's guarded importer and task PR draft. Do not overwrite your checkout
with the complete source snapshot. Preserve later local edits when integrating.
Keep the final `story-4` → `story-3` Cross-Check PR unmerged.

[Official favorites task](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-2-1-favorites-api.md)
