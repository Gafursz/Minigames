# Feature 7: backend pagination

## What changed

The Library pagination control now uses `page` and `totalPages` from the games response. Page buttons and arrows request the backend page through the existing URL-driven Library flow. The browser never slices a preloaded game collection to simulate pagination.

This feature implements [RSS-QS-3-2-4](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/RSS-QS-3-2-4-library-pagination-api.md). Its task branch is `feature/library-pagination`, based on the prepared filter/sort feature. Merge the earlier task PRs into `story-3` before publishing this task PR.

## How the pieces fit

| File                                    | Responsibility and reason                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/pagination.ts`          | Renders the response's current page and page count, emits requested page changes, and manages disabled/loading/focus states. It no longer assumes four total pages.                         |
| `src/features/library/library-games.ts` | Validates pagination metadata before rendering, then reports loading/error/ready state and the returned metadata to its page owner. Its existing cancellation guard also protects metadata. |
| `src/pages/library-page.ts`             | Connects pagination changes to the router, feeds response metadata back into the control, and normalizes exceptional page values consistently with the URL.                                 |
| `tests/pagination/pagination.test.mjs`  | Exercises the actual App, router, API client, and pagination together, including responsive button windows and request races.                                                               |

The existing `getPageWindow()` utility and SCSS `--page-buttons` variable remain in use. CSS supplies a visible limit of three page buttons on mobile and four on tablet/desktop. A `ResizeObserver` updates that window without fetching data again. If the backend reports only two pages, only two numbered buttons appear. The surrounding previous/next arrows remain visible.

## Trace a page change

1. A user selects page 2. Pagination calls its `onChange(2)` callback.
2. Library updates only the URL's `page` value, preserving category, sorting, and unrelated parameters.
3. The router publishes the resulting route. Library requests that exact category/sort/page with `limit=6`.
4. Six skeleton placeholders replace the old list. Pagination is temporarily disabled and marked `aria-busy`, preventing duplicate clicks while the request is pending.
5. The returned cards replace the skeletons. The response metadata updates the active page, page window, total announcement, and arrow states.

Back/Forward follows the same route-to-request path. Changing category or sorting resets page 1 through the existing Feature 6 behavior. A keyboard user can use Left/Right, Home, and End; boundary keys do not issue duplicate requests. If focus was inside pagination when its DOM updates, focus is retained there. If the user has moved elsewhere, a completed request does not steal focus.

## Empty, invalid, and failed pages

A genuinely empty collection shows **Data Not Found**, numbered page 1, and both disabled arrows. The URL is normalized to page 1 with replacement history, without requesting the same empty collection again. The URL omits the default `page=1` text, but the API request always includes the numeric page.

The live backend returned HTTP 200 and an empty array for `page=999`, while metadata still reported 24 items and four pages on 4 October 2026. That means the requested page is outside a nonempty collection. In this case the application replaces the URL page with 1 and makes a real page-one request. It does not show page-one controls over cards from a different page or loop through invalid requests.

If a backend response itself normalizes the page and supplies that page's cards, the application updates the URL with `replaceState` and reuses that response. It does not issue a redundant request merely to acknowledge the server's page number.

Malformed numeric metadata becomes a retryable error. Error states disable pagination until a successful Retry or a new category/sort request supplies valid metadata. Retry preserves the failed request parameters. Starting another request or leaving Library aborts old work; late metadata cannot change the current page count.

## Verification

Ten new integration tests cover response-driven mobile/desktop page windows; smaller totals; complete API parameters and returned cards; direct links and Back/Forward; category/sort reset; empty page-one controls; out-of-range bookmarks; malformed metadata and Retry; keyboard boundaries/focus; stale metadata; and observer/listener disposal.

Run `npm run test:pagination`. `npm run` selects the named script in `package.json`; this script runs `node --test --experimental-test-isolation=none tests/pagination/*.test.mjs`. `--test` activates Node's test runner, the isolation option keeps the established project test setup, and the final glob selects the pagination test files. Expected result: ten passing tests and no failures.

Also run `npm run test:library` and `npm run test:filters` to verify the connected list and controls. `npm run lint` checks ESLint rules, `npm run format:check` checks formatting without changing files, and `npm run build` performs TypeScript checking and the Vite production build.

Tests use controlled responses and jsdom. Native browser sizing, focus behavior, and deployed deep-link refresh still require the manual checklist in the delivery package. No external router or runtime dependency was introduced. Commits use the requested Gafursz identity and actual creation timestamps.
