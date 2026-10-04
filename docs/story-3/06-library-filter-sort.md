# Feature 6: Library filtering and sorting through the API

## What this feature completes

Category controls now come from `GET /api/categories`. Selecting a category or sort option updates the URL and requests a new list from `GET /api/games`. The backend receives the category, sort, page, and fixed limit together. The browser renders the returned order without filtering, sorting, or slicing the game collection itself.

This implements the category-filtering and sorting tasks, [RSS-QS-3-2-2](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/RSS-QS-3-2-2-library-category-filtering-api.md) and [RSS-QS-3-2-3](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/RSS-QS-3-2-3-library-sorting-api.md), worth 35 points each before review. It also connects their URL state to the router prepared in Feature 3. This is not a claim that the whole Story 3 routing task is complete: dialog synchronization and pagination controls have later features.

## Files and responsibilities

| File                                           | What changed                                                                                                                | Why it belongs here                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/components/library-filters.ts`            | Fetches and validates categories; renders their API labels and order; exposes category/sort callbacks and loading state.    | The filter component owns its controls and category request, while the page coordinates the games request.        |
| `src/components/library-sort.ts`               | Gives each existing option a typed API value; adds `setValue()` and an `onChange` callback; preserves keyboard interaction. | The displayed label follows router state, including Back/Forward and a pasted URL.                                |
| `src/pages/library-page.ts`                    | Receives route updates, applies them to controls, and loads the matching games query once categories are ready.             | One coordinator combines category, sort, and page instead of letting components keep competing navigation state.  |
| `src/app/app.ts`                               | Passes the existing router's `updateQuery()` method into `LibraryPage` through a callback.                                  | The page can request navigation without importing a router singleton or a third-party router.                     |
| `src/features/library/library-games.ts`        | Adds `showLoading()` and `clear()` for the category-loading dependency.                                                     | A failed or empty categories request must not leave the games region indefinitely busy.                           |
| `src/components/content-feedback.ts`           | Adds the `categories` skeleton shape to the existing shared feedback component.                                             | Categories receive the same loading/error/empty lifecycle as other public data.                                   |
| `src/styles/components/_content-feedback.scss` | Styles the category skeleton using existing spacing and radius tokens.                                                      | The existing SCSS method and reduced-motion support remain in use.                                                |
| `tests/library-controls/controls.test.mjs`     | Tests the actual App, router, controls, and HTTP layer together.                                                            | URL changes, request parameters, history, and race conditions need integration coverage.                          |
| `tests/library/library.test.mjs`               | Makes the basic list test exercise `LibraryGames` directly.                                                                 | The page now has a categories dependency; the separate list test should still test the card loader independently. |
| `tests/router/app.test.mjs`                    | Mocks the newly API-backed Library request during routing tests.                                                            | Router tests remain deterministic and do not call the live backend.                                               |
| `package.json`                                 | Adds `npm run test:filters`.                                                                                                | The new tests can run independently or with the full project checks; no dependency is added.                      |

## Trace an initial Library visit

1. The router parses the current URL into `RouteState`. A missing or invalid sort becomes `rating-desc`; a missing or invalid page becomes page 1. An explicit category stays available to the backend, even if it is unknown.
2. The Library mounts an empty categories region and an empty games region. Both show skeletons while categories load.
3. `LibraryFilters` requests `/api/categories`. It validates the array, string labels/slugs, unique slugs, boolean `isDefault` fields, and exactly one default for a nonempty list.
4. The component renders buttons with the labels and order from that response. It reports the default category to the page.
5. If the URL already has a category, that value wins. Otherwise, the page adds the API's default category with `replaceState`, so discovering a default does not add an extra browser Back step.
6. `LibraryPage.updateRoute()` paints the active chip and sort label, then calls `LibraryGames.load({ category, sort, page })`. The public API client adds `limit=6`.
7. The cards region displays the backend result, or its shared error/empty state.

For example, visiting `/Minigames/library?category=puzzle&sort=name-asc&page=3` requests:

```text
GET /api/categories
GET /api/games?category=puzzle&sort=name-asc&page=3&limit=6
```

The category is not selected by assuming the first returned item is the default. An integration test deliberately returns `card` as the default and puts `all` second to check this behavior.

## Trace a category or sort click

The control emits a value. It does not independently change the list or permanently select itself. The page calls `navigate({ category, page: 1 })` or `navigate({ sort, page: 1 })`; the App forwards this to `Router.updateQuery()`.

The router preserves the other query parameters and pushes the new URL into browser history. It then publishes the parsed URL state back to the page. The page updates both controls from that state and starts the matching backend request. Resetting page 1 prevents a category with fewer results from inheriting an old page number.

The router omits default `sort=rating-desc` and `page=1` from its normalized URL. That is a shorter representation of the same state: both defaults are still sent explicitly to the backend. A category remains explicit because its default is provided by an asynchronous API response.

| Visible option | API value     |
| -------------- | ------------- |
| Rating down    | `rating-desc` |
| Rating up      | `rating-asc`  |
| Name A to Z    | `name-asc`    |
| Name Z to A    | `name-desc`   |

`GameSort` limits the callback to those four allowed values. The dropdown retains Arrow keys, Home/End, Enter/Space, Escape, Tab, and outside-pointer dismissal. Selection returns focus to the trigger.

## Why the URL is the source of truth

Pasted URLs and browser Back/Forward use the same `updateRoute()` path as clicks. A user can return to an earlier category/sort combination without recreating the whole page. The list request is derived from that route, not from an independently maintained array or a stale dropdown value.

`requestKey` only records which category/sort/page combination was last requested. It is not a second navigation store. It prevents a dialog-only or unrelated query change from fetching identical Library data again. A real category, sort, or page change produces a new key and a new request.

If the user changes sorting while categories are still loading, the URL updates immediately. Once categories arrive, the first games request uses that latest URL rather than the initial selection.

## Failures, empty responses, and cancellation

Each loading region uses the shared `ContentFeedback` component. Categories and games both have animated skeletons, a persistent error banner with Retry, and a distinct successful-empty placeholder. Failed requests show the existing error Snackbar; a successful Retry shows a success Snackbar. No browser `alert()` or `confirm()` is used.

A categories error clears the dependent games skeleton, because no request is currently loading those cards. Retry reloads categories; if successful, the page then requests games using the latest URL. An empty categories response shows **Data Not Found** and does not invent a hardcoded category list.

An unknown category is not a page-route error. For example, `/library?category=does-not-exist` remains on Library, sends that category to the backend, and displays its error in the cards region. No category chip is falsely shown as selected. Selecting a valid chip recovers normally.

Starting a newer games request aborts the previous one. The controller identity is also checked before applying its result, so an obsolete success or failure cannot overwrite current cards or show an old Snackbar. Leaving Library aborts both category and games work, removes listeners, and ignores late responses.

API labels and slugs are escaped for HTML; the URL and API client use `URLSearchParams` for query encoding. A quote or ampersand in data cannot inject a button attribute or a second query parameter.

## Verification and what it proves

The 15 new integration tests cover:

- API category labels/order and an API-selected default without an extra history entry.
- Direct URLs, active controls, all four API sort values, and preserved server order.
- Category/sort combinations, page reset, preserved unrelated parameters, and duplicate-selection suppression.
- Browser Back/Forward with matching requests and a stable mounted page.
- Sorting before categories finish and multiple fast category changes.
- Categories failure, duplicate Retry protection, successful recovery, empty data, and malformed responses.
- Escaped labels/slugs, unknown categories, keyboard controls, dialog-only query changes, and cancellation when leaving the page.

Run `npm run test:filters` to execute this integration suite. `npm run` selects a script from `package.json`; `test:filters` is its name. The script uses `node --test` to run Node's test runner, `--experimental-test-isolation=none` to use the repository's existing shared test setup, and `tests/library-controls/*.test.mjs` to select the test files. Expected output: 15 tests, 15 passes, and no failures.

Also run `npm run test:api`, `npm run test:ui`, `npm run test:router`, and `npm run test:library` for the dependent layers. Use `npm run lint` for ESLint, `npm run format:check` for a read-only Prettier check, `npm run typecheck:feedback` for the existing feedback preview types, and `npm run build` for TypeScript and Vite production output. After Feature 4 is integrated, include `npm run test:home` as well.

On 4 October 2026 at approximately 15:08 Asia/Tashkent, public read requests confirmed that categories returned HTTP 200 with seven entries, the combined puzzle/name-ascending query returned HTTP 200, and an unknown category returned HTTP 400. These observations verify the current API contract; they are not hardcoded result counts.

The integration tests use jsdom and controlled fetch responses. They do not prove native browser rendering or deployed-host fallback behavior. On the deployed app, check mobile category dragging, keyboard sorting, Slow 3G loading, blocked-request Retry, direct-link refresh, and Back/Forward. These manual checks remain listed in the delivery guide rather than being reported as completed.

The completed Feature 6 branch passed 74 tests. Combining it with the prepared Home API branch passed all 86 tests, ESLint, Prettier, feedback-preview type checking, and the TypeScript/Vite production build. The generated `dist/404.html` matched `dist/index.html`. The merge was clean, including the newer 404 page work already present on `story-3`.

## What remains and how to integrate

Feature 7 must connect the pagination buttons and page count to backend metadata. This feature already reads a URL page and resets it on filtering/sorting, but the existing pagination control is still the Story 2 control. API-driven Game Details/comments and visible dialog URL synchronization also remain for their later features. Authentication and mutations remain Story 4 work.

`feature/library-filter-sort` is based on the completed `feature/library-api` tip. Import and merge the prepared Home API feature, then create and merge the Feature 5 task PR into `story-3`, then create and merge this Feature 6 task PR into `story-3`. Keep the final cross-check PR from `story-3` to `story-2` unmerged. The package does not push, merge GitHub PRs, or change your Windows folder by itself.

All new commits use `Gafursz <gafurjon.sh@gmail.com>` and their actual creation timestamps. No timestamp rewriting or artificial feature duration is part of the implementation.
