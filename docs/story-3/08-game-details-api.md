# Feature 8: Game Details and latest comments from the API

## What changed

The Game Details dialog now opens the game identified by a card's slug and requests `/api/games/{slug}`. Its previous static Tukoni data is no longer used. After valid details arrive, comments load from `/api/games/{slug}/comments?limit=3&sort=newest`.

This implements the public-read tasks RSS-QS-3-3-1 and RSS-QS-3-3-2. Authentication, favorites changes, posting, and comment likes remain Story 4 work. Gameplay launching is also outside this integration; its existing button is shown as unavailable.

## Files, how they work, and why

| File                                        | Responsibility                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/game-details/game-details.ts` | Owns the selected slug, details request, modal lifecycle, loading/error/not-found states, cancellation, and comment mounting. The close button stays outside replaced content, so it remains usable during loading and errors. |
| `src/features/game-details/game-data.ts`    | Validates response objects before rendering. TypeScript interfaces alone cannot validate network data. A returned slug must match the requested slug.                                                                          |
| `src/components/game-info.ts`               | Renders API title, description, ratings, likes, and four known specification fields. Removes the seed import and simulated favorite toggle.                                                                                    |
| `src/components/game-records.ts`            | Renders returned records in server order, with scores and achieved times; an empty list has a placeholder.                                                                                                                     |
| `src/components/game-comments.ts`           | Owns comments loading and Retry, independently of the loaded details, and uses `meta.totalComments` for its heading.                                                                                                           |
| `src/utils/relative-time.ts`                | Formats timestamps consistently; accepts an optional current time for deterministic tests.                                                                                                                                     |
| `src/utils/game-hero.ts`                    | Resolves API hero paths through Vite's imported assets and reuses safe HTTPS handling for external images.                                                                                                                     |
| `src/app/app.ts`                            | Passes the clicked card's slug into the dialog. Feature 9 connects the visible dialog to URL state.                                                                                                                            |
| Dialog/comments/records SCSS                | Keeps tokens, breakpoints, and animations while allowing long text and feedback to fit. Removes the mockup-only mobile comment text substitution.                                                                              |
| `tests/game-details/`                       | Tests actual components and HTTP requests against controlled responses.                                                                                                                                                        |

## Follow one opening

`open(slug, trigger)` remembers the trigger for focus restoration, opens the modal immediately, and shows a skeleton. Its public request includes neither credentials nor a personalized email parameter.

Runtime guards check text and numeric fields, specifications, record timestamps, and the returned slug. A valid response renders the hero, information, records, and comments shell. That shell then starts its own request and loading state.

The server selects the latest three comments. The renderer keeps their returned order and does not sort a larger collection locally. The heading uses `meta.totalComments`, so three displayed comments can correctly appear under **Comments (12)**.

A comments failure replaces only the comments list region. The game title, hero, description, and records remain visible. Retrying comments does not refetch details. A details failure has its own persistent error and Retry; comments are requested only after a valid game is available.

## Empty, missing, and malformed data

HTTP 404 produces **Game Not Found** inside the open dialog, keeping the underlying page intact. A successful `data: null` response has the same missing-game state. Invalid slug syntax is handled locally without sending a malformed API path.

Malformed responses instead produce retryable errors. They never leave partially rendered content or silently restore seed data. Empty records show **No records yet**. Empty comments show **No comments yet**, with the exact response total in the heading.

## Relative time

The formatter shows **just now** for less than one minute, then whole minutes, hours, days, weeks, months, and years. It uses 7-day weeks, 30-day month buckets (four weeks enters the month range), and 365-day year buckets. The required 1–3 week and 1–11 month ranges are preserved, with correct singular/plural labels.

Future timestamps are clamped to **just now**. The formatter has an **Unknown time** fallback, but invalid API timestamps are rejected earlier as section errors. Tests fix the current time and check every boundary, so results do not depend on the day the tests run.

## Safe text, guest behavior, and cleanup

API strings are escaped before interpolation. Specification labels are fixed known labels, so arbitrary extra response keys cannot become HTML. Unsafe or unavailable hero URLs receive a placeholder. Long names, descriptions, and comments can wrap.

Favorite and comment-like controls are disabled for this public-read stage. Comment submission is disabled, and the form also prevents its submit event. Textarea auto-growth remains for draft text. No write request occurs; every API call in this feature is GET.

Switching games aborts old details and comments requests. Closing aborts them immediately, even while the exit animation runs. A response also checks its request identity, preventing late data or errors from affecting another game. Reopening during closing cancels the old timer and loads current data. Page disposal removes listeners and avoids restoring focus into removed content.

## Verification

Fourteen tests cover rendered fields and request options; latest-comment limit and exact total; safe text/media; independent Retry; unknown/empty/malformed games; malformed comments; empty records/comments; guest controls; stale responses; cancellation and focus; reopening during closing; and relative-time boundaries.

Run `npm run test:details`. `npm run` selects a script from `package.json`. The script uses `node --test` for Node's test runner, `--experimental-test-isolation=none` for the established setup, and `tests/game-details/*.test.mjs` to select files. Expected result: fourteen passes and no failures.

`npm run lint` checks ESLint, `npm run format:check` checks formatting without edits, and `npm run build` checks TypeScript and builds production assets. Final combined regression results are recorded in the delivery package.

Live public reads on 4 October 2026 confirmed successful Tukoni details, three latest comments, and HTTP 404 for a nonexistent slug. Tests use jsdom; native modal animations, image loading, responsive layout, and deployed deep links remain browser checks.

Work is on `feature/game-details-api`, following pagination. Merge earlier feature task PRs into `story-3` before this task PR. Commits use Gafursz and actual timestamps. Keep the final cross-check PR to `story-2` unmerged.
