# Feature 4: Home page API integration

## What changed and why

Home now fetches its New Games carousel and Top Players table from the public backend. The carousel no longer chooses featured items from the local JSON seed, and the leaderboard no longer imports its seed JSON. The existing seeds remain available to the not-yet-converted Library and Game Details features.

The two sections load independently. A failed leaderboard request must not remove games that loaded successfully, and a slow carousel request must not block the rest of Home. Each region uses the shared feedback components from Feature 2 for loading, error, empty, and retry states.

This feature targets RSS-QS-3-1-1 and RSS-QS-3-1-2, the two Home API criteria worth 15 points each. This is an implementation scope statement, not an official awarded score. Library API filtering/sorting/pagination and Game Details/comments remain later work.

## Requests and ownership

| Section     | Request                        | Rendering                                                                                                                    |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| New Games   | `GET /api/games?featured=true` | Each returned game becomes a card, in server order, using its name, image path, rating, likes, and slug.                     |
| Top Players | `GET /api/leaderboard`         | Each returned player becomes a table row, in server order, using rank, name, games played, score, streak, and favorite game. |

Both calls go through `src/api/minigames-api.ts` and the existing HTTP client. They use `credentials: 'omit'` and no authorization header. No third-party data or routing library was added. No client-side game filtering, sorting, or pagination replaces an API request.

The initial successful load is quiet. Failed requests show an error Snackbar as well as the persistent region error banner. A successful manual retry shows a success Snackbar. A valid empty array is an empty state, not a network failure, and has no Retry button.

## File-by-file explanation

| File                                      | What / how / why                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/home/home-resource.ts`      | Coordinates one section's request with `ContentFeedback` and `snackbar`. Both sections share identical retry and cancellation behavior without duplicating that control flow.      |
| `src/features/slider/slider.ts`           | Fetches featured games, renders the response, and binds the existing carousel logic only after cards exist. Owns request, gesture listeners, ResizeObserver, and autoplay cleanup. |
| `src/components/leaderboard.ts`           | Fetches leaderboard rows and its desktop title. Escapes API text in table markup; uses `textContent` for the section title.                                                        |
| `src/pages/home-page.ts`                  | Starts both sections when mounted and destroys both when leaving Home. The router branch also adds header disposal.                                                                |
| `src/components/game-card.ts`             | Accepts the API card shape, resolves the response's image field, and includes its slug in `data-game-details` for later dialog integration.                                        |
| `src/components/game-stats.ts`            | Escapes interpolated rating/like values rather than trusting a network response as HTML.                                                                                           |
| `src/utils/game.ts`                       | Maps backend image paths to Vite's bundled assets. Keeps the old slug helper for existing Library code.                                                                            |
| `src/features/slider/slider.scss`         | Allows feedback content to fit, styles disabled controls, and hides off-screen cards for any response length. Uses existing tokens and breakpoints.                                |
| `src/styles/components/_leaderboard.scss` | Allows the section to grow with actual data and removes the old rule that hid players after the third row. Keeps the existing responsive column choices.                           |
| `tests/home/`, `tests/helpers/`           | Exercise actual components and the real API client against controlled responses, without making live network requests during the test suite.                                       |
| `package.json`                            | Adds `npm run test:home`.                                                                                                                                                          |

## Understanding `HomeResource<T>`

`T` is a TypeScript generic: each instance knows the shape of its own response. The carousel uses `FeaturedGamesResponse`; the table uses `LeaderboardData`. This preserves compile-time checking without an explicit `any`.

The constructor receives the region element and a small configuration: request function, empty check, renderer, skeleton layout, labels, and optional callbacks for mounting/clearing interactive content.

`load()` follows these steps:

1. Abort an older request owned by this resource and clear old content bindings.
2. Show the correct skeleton and set `aria-busy="true"` through `ContentFeedback`.
3. Await the public request.
4. Check that this resource is still alive and this request is still current.
5. Show an empty placeholder or render the response. A malformed collection goes to the error path instead of silently using seed data.
6. On failure, show the error banner with Retry and an error Snackbar. The banner remains until another request changes the region.

`destroy()` marks the resource as dead, aborts its request, clears interactive bindings, and disposes of feedback listeners.

An AbortController tells `fetch` to cancel. The extra current-request check has a different job: it prevents a late response from writing to the page even when a transport ignores abort or cancellation arrives after the response has already resolved. The tests intentionally simulate this race.

## Preserving the slider behavior

The existing `AutoplayTimer`, slide-position model, and swipe/drag helper are reused. The response replaces only the data source and adds lifecycle management:

- Before data arrives, controls are disabled and autoplay does not start.
- Zero games show the empty state. One game displays normally with disabled arrows and no timer.
- Two or more games enable arrows and bind the existing gestures and autoplay.
- If a dialog opens before the request finishes, that fact is remembered; the newly mounted carousel starts paused.
- Page disposal stops autoplay, aborts gesture/button/visibility listeners, and disconnects ResizeObserver.
- The old CSS covered only the original nine cards. An `aria-hidden` rule now also hides off-screen cards when the server returns a larger collection.

Changing the carousel's active slide is presentation logic. It does not filter or paginate the fetched collection, and it does not replace backend Library pagination.

## Images and safe text

The current API sends paths such as `/assets/images/games/cat-mail-co-card.jpg`. Those files live in `src/assets/images/games` and are renamed by Vite during production builds. The resolver uses the API's path to select the bundled file URL. It does not assume the game's slug is its image filename.

A valid absolute HTTPS image URL is also supported. Unknown local images or unsafe URL schemes produce a simple placeholder. User-visible names remain escaped; an API string containing `<img onerror=...>` is displayed as text, not executed as markup.

Formatting a score with commas or deriving avatar initials changes presentation only. The API's rank/order, game membership, and player membership are not recalculated in the browser.

## Responsive SCSS decisions

The prior fixed section heights and three-player cut-off were tied to the static mockup. With real data or multi-line error text, they could clip content. The new code keeps the same colors, typography, borders, breakpoint approach, and minimum heights, while allowing sections to grow.

All returned players stay in the table. The existing small-screen column hiding remains: narrow layouts show rank, player, score, and streak; other fields remain in the markup and appear at wider breakpoints. The Story 3 criteria do not score Pixel Perfect layout matching.

## Verification

```bash
npm run test:home
npm run test:api
npm run test:ui
npm run typecheck:feedback
npm run lint
npm run format:check
npm run build
```

The 12 Home tests cover:

1. Exact public request paths/options, independent loading, skeletons, server values/order, and image mapping.
2. Escaping untrusted API text and attributes.
3. Featured-games HTTP failure, isolated Retry, duplicate-click protection, and Snackbar recovery.
4. Leaderboard network failure, repeated Retry, and successful empty recovery.
5. Distinct empty states and disabled controls.
6. Malformed responses with no silent seed-data fallback.
7. Leaving Home while both requests are pending, including late success/failure after abort.
8. Arrow navigation/wrapping across 12 games and listener disposal.
9. No autoplay timer for a single game.
10. A dialog opened before data arrives still pausing autoplay.
11. Safe image URL resolution.
12. A newer request winning when an aborted older request resolves last.

The actual public endpoints were also checked on 4 October 2026: both returned HTTP 200 with CORS `*`; featured games returned 9 items and leaderboard returned 5 players. These are observations from that check, not permanently assumed counts in the implementation.

The automated integration tests use Vite to bundle actual modules and jsdom for DOM behavior. They do not constitute visual/browser testing. Before submitting, use Chrome DevTools:

1. Open Home with Slow 3G selected. Confirm each skeleton stays until its own response arrives.
2. Block the leaderboard URL and reload. Games should still work; the table should show an error and Retry.
3. Unblock that URL and click Retry. Confirm one new leaderboard request and a success notification.
4. Repeat for the games endpoint, then verify arrows, swipe/drag, autoplay, and dialog pausing.
5. Navigate away while requests are pending; verify no old content or Snackbar appears on the next page.
6. Check at 375px, 768px, 1440px, and 1920px, including long names and multi-line feedback. No horizontal page scroll should appear.
7. Empty/malformed response handling is covered by controlled tests; do not modify the real public backend to manufacture those cases.

## Integration and remaining work

This feature starts at the same merged baseline as Feature 3: `1cbafb36e3df0d8ada21749563ec0922bbbb4caa`. It is a separate `feature/home-api` branch, not a direct edit on `story-3`. Merge its task PR into `story-3` after the router task PR. Both branches preserve the common API and feedback foundation.

The Game Details dialog still uses its previous static data. Adding a slug to a card prepares the next integration; it does not claim that clicking every Home game already fetches that game's details. That is Feature 8, followed by dialog URL synchronization in Feature 9.

After Features 3 and 4, the next planned task is `feature/library-api`: replace the Library card seed with the paginated public response. Category/sort controls and URL-driven pagination follow in their own branches.

Commits use `Gafursz <gafurjon.sh@gmail.com>` with real creation timestamps. The package's verification record lists the exact commit IDs. Source files in this branch have not been copied into your Windows checkout or pushed by this environment.
