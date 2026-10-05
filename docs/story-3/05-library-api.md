# Feature 5: Library cards from the public API

## What this feature completes

The Library card list now requests backend data with `limit=6`, renders the returned items, and uses the existing shared skeleton/error/empty/Snackbar components. It implements the scope of [RSS-QS-3-2-1](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/RSS-QS-3-2-1-library-game-cards-api.md), worth 15 points before review.

This branch is the card-list foundation. Category controls and sorting are connected in Feature 6; metadata-driven pagination controls belong to Feature 7. The Game Details dialog remains static until its own API feature. These later criteria are not claimed by this branch.

## What changed, how, and why

| File                                       | Change and purpose                                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/library/library-games.ts`    | Owns fetching, validation, response rendering, Retry, and cancellation for one mounted Library list.                                                            |
| `src/pages/library-page.ts`                | Renders an initially empty card region, starts the request during `bindEvents()`, and disposes of it in `destroy()`. Removes the seed import and `slice(0, 6)`. |
| `src/components/library-card.ts`           | Accepts an `ApiGame`, uses its `cardImage` field, safely renders text, and attaches the game slug to the Details trigger.                                       |
| `src/utils/game.ts`                        | Resolves API asset paths through Vite's existing image imports; rejects unsafe image URL schemes. This is the same helper prepared in Feature 4.                |
| `src/components/game-stats.ts`             | Escapes displayed rating/like text. This matches the Feature 4 change.                                                                                          |
| `src/styles/pages/_library.scss`           | Makes feedback span the full card grid and removes the mockup-specific CSS ordering, so every breakpoint preserves server order.                                |
| `src/styles/components/_library-card.scss` | Styles unavailable-image placeholders and prevents long API text from forcing the card wider. Uses existing SCSS tokens.                                        |
| `tests/library/`                           | Tests actual Library components and the public HTTP client with controlled responses.                                                                           |
| `tests/helpers/`                           | Reuses the same Vite/jsdom helpers as Features 3 and 4.                                                                                                         |
| `package.json`                             | Adds `npm run test:library`; no dependency is added.                                                                                                            |

## Following a request

`LibraryPage.bindEvents()` finds the rendered cards region and creates `LibraryGames`. Its `load()` method sends the default query through the already-merged public API client:

```text
GET /api/games?category=all&sort=rating-desc&page=1&limit=6
```

`category`, `sort`, and `page` are captured together in a new object. `limit=6` is added by `getLibraryGames()` using the existing API constant. When the filter/sort feature supplies another query, the same list class can load it; the list itself does not own a second copy of navigation state.

The loading region immediately gets six animated skeleton placeholders and `aria-busy="true"`. A valid response replaces those placeholders with cards in the exact order received. A successful empty array shows **Data Not Found**, without a Retry button. A failed request shows a persistent error banner with Retry and a non-blocking error Snackbar. A successful Retry shows a success Snackbar.

The server decides which six games belong to a page. The browser does not fetch all games and slice/filter/sort that collection. One test deliberately supplies seven items to prove the renderer does not silently trim the response; the real request still always asks for six.

## Why validation is separate from TypeScript types

An interface describes what the compiler expects, but a server response is runtime data. `readGames()` checks that `data` is an array and that each card has the string fields and finite numeric fields required by the renderer. Invalid data becomes a readable error state. It does not leave a partially rendered list or silently substitute the seed JSON.

This validation uses `unknown` and type guards, not `any`. Checking every item is validation, not client-side category filtering: valid items are not selected or reordered locally.

## Retry and race conditions

Retry uses a snapshot of the failed request parameters. If another part of the application later changes the original query object, Retry still repeats the attempted request accurately.

Starting another load aborts the previous request. The code also checks that the response still belongs to the current controller before touching the DOM. That second check matters when a response finishes after cancellation or a mocked transport ignores abort.

Leaving the page calls `destroy()`: the request is aborted, obsolete Retry listeners are removed, and late success/failure cannot update another page or show an old error notification. Calling `load()` on a destroyed list does nothing.

## Images, text, and SCSS

The API currently returns repository-style paths such as `/assets/images/games/cat-mail-co-card.jpg`. Vite renames bundled assets in production, so the resolver maps that API path to the imported file URL. It also permits absolute HTTPS URLs without embedded credentials. Unknown local paths and unsafe schemes use a placeholder.

Titles, descriptions, categories, prices, and trigger attributes are escaped before becoming HTML. A value like `<img onerror=...>` remains literal text. Ratings and likes are validated as numbers and displayed through the shared stats component.

SCSS still uses `@use '../tokens'`, the existing breakpoint mixins, BEM classes, and the current responsive grid. `grid-column: 1 / -1` lets a banner or skeleton wrapper span all columns. The old `order` rules were removed because backend sorting must remain visually correct on mobile as well as desktop.

## Verification

The ten Library tests cover the initial request and all card fields; response order and count; escaped text and placeholder images; successful empty data; HTTP errors and duplicate Retry clicks; repeated network failure/recovery; malformed responses; stale successes; stale failures; page disposal; and detached Retry listeners.

Commands used for verification:

| Command                | Meaning                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run test:library` | `npm run` executes the named script in `package.json`; this one runs the Library tests with Node's test runner.   |
| `npm run test:api`     | Checks the shared public API client and endpoint query construction.                                              |
| `npm run test:ui`      | Checks the already-merged shared feedback and Snackbar components.                                                |
| `npm run lint`         | Runs ESLint's project rules, including the ban on explicit `any`.                                                 |
| `npm run format:check` | Checks Prettier formatting without rewriting files.                                                               |
| `npm run build`        | Runs TypeScript and Vite's production build. With Feature 3 included, the postbuild hook also creates `404.html`. |

The real endpoint returned HTTP 200 on 4 October 2026 at 11:44 Asia/Tashkent, with six cards, `limit=6`, `totalItems=24`, and `totalPages=4`. Counts remain response data, not assumptions encoded in the renderer.

Tests use jsdom and mocked browser APIs. Actual browser layout, native image loading, and deployed behavior still need a browser check. In Chrome, use Slow 3G to see the skeleton; block `/api/games`, reload, unblock it, and click Retry. Then navigate away during loading and inspect 375px, 768px, and desktop widths. Do not modify the shared backend to manufacture failures.

## Branch and integration

Work belongs to `feature/library-api`, targeting `story-3` through a task PR. The branch was started from the merged UI-feedback baseline `1cbafb3`; the newer merged router work is integrated before delivery. Your additional 404 styling is preserved.

The matching image/stats/test helper changes also exist in the prepared Home API branch. They use identical content so those branches can combine without duplicating behavior. Import and merge Features 3 and 4 before publishing this task PR; then merge this feature's task PR into `story-3`.

The final cross-check PR `story-3 → story-2` stays unmerged. Commits use `Gafursz <gafurjon.sh@gmail.com>` and real timestamps. No Windows files or remote branches are changed merely by preparing this package.
