# Feature 9: dialogs follow the URL and browser history

## What changed

Game Details and Login/Register now use the same pure TypeScript router as Home and Library. A card opens `?game=<slug>`. Account access opens `?auth=login` or `?auth=register`. Copied URLs restore the base page and dialog. Browser Back/Forward restores their earlier states without reloading the page.

This feature is based directly on Story 3 after task PR #10, including the integrated Features 1–8 and the newer Figma and illustrated empty/error states. It completes the dialog connection prepared in Feature 3. No external router was added. Authentication and authenticated mutations remain Story 4 work.

## Files, how they work, and why

| File                                       | Responsibility                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/app.ts`                           | Converts user actions into URL updates, then applies the parsed route to dialogs. Coordinates both modals, focus, page disposal, and the Home slider pause state.                                                        |
| `src/features/auth-dialog/auth-dialog.ts`  | Requests URL changes through callbacks for close and mode changes. Its open/close methods apply state without writing extra history entries. Cancels stale exit timers and preserves entered text during mode switching. |
| `src/components/header.ts`                 | Hides the mobile menu immediately when its account button opens Auth, keeping the burger state correct.                                                                                                                  |
| `tests/dialog-routing/`                    | Exercises actual App, router, dialogs, and HTTP request behavior with controlled responses and jsdom history.                                                                                                            |
| `tests/library-controls/controls.test.mjs` | Separates game-detail mock requests from the Library request queue now that existing game query values open real dialogs.                                                                                                |
| `package.json`                             | Adds the `test:dialogs` command.                                                                                                                                                                                         |

Existing SCSS tokens, breakpoints, modal animations, and component classes remain in use. This task connects behavior to the existing layout; it does not require another styling system.

## Follow a card click

1. App reads the clicked card's slug and requests a game query update, clearing any auth parameter.
2. Router writes a history entry, reads the resulting URL, and publishes its RouteState.
3. The page receives that route. Library compares category/sort/page, so a dialog-only update does not refetch unchanged cards.
4. App's `syncDialogs()` applies the route's dialog. A changed slug opens Game Details and triggers its existing API lifecycle. An auth route opens or switches Login/Register. No dialog parameter starts the closing animation.

App remembers the last applied dialog key only to avoid duplicate rendering. It does not use that key as a competing navigation store. The URL remains the source of truth. Page changes reset the key before binding the new page's dialogs.

## Open, close, and history

Explicit opening, closing, and Login/Register switching use `pushState`. Back/Forward reads the reached URL without adding an entry. Normalization uses `replaceState`. Requesting an already-current URL adds nothing.

Your example is covered directly: open Game 1, close, open Game 1 again, close, open Game 2, close, open Game 3. Seven Back presses replay every earlier state in reverse, including both Game 1 openings. Seven Forward presses replay all seven actions. The test checks the visible dialog at every step.

Close removes only its dialog parameter. Category, sort, page, and unrelated query values remain. The close button, backdrop, and Escape follow the same route update. Closing neither submits a form nor reloads the document.

## Direct links and invalid states

The existing deployment base is `/Minigames/`. Examples are `/Minigames/library?category=puzzle&sort=name-desc&page=2&game=tukoni-forest-keepers` and `/Minigames/?auth=register`.

A valid page with an unknown or malformed game slug keeps its base page and displays Game Not Found inside the modal. An unknown page path instead displays the dedicated 404 page with header/footer and a Home link. A valid auth mode takes priority if both auth and game parameters are present, and normalization removes the game parameter. Invalid auth values are removed by the existing parser.

Direct-link refresh also requires the host to serve the app entry document. The build creates a GitHub Pages `404.html` fallback; Pages can render the app from that fallback while retaining HTTP 404 status. Check the published deep links separately from Vite development navigation.

## Focus, pause, and cancellation

Switching modal types immediately closes the previous modal before opening the next. The slider pause state is derived from whether any dialog is open, including during an exit animation.

Normal close returns focus to its trigger. Mobile account access returns focus to the burger because the menu is hidden. A direct link uses the base page heading as a fallback. Page navigation destroys old dialogs without restoring focus into disconnected content. Heading focus never steals focus from a newly opened modal.

The Game Details lifecycle from Feature 8 aborts details/comments requests when closing, replacing a game, or leaving the page. A request identity check also rejects late responses. Reopening during an exit cancels the old closing timer. Auth mode changes retain entered values; closing resets forms. Credentials are never stored in the URL.

## Verification

Eighteen integration tests cover copied Library/Auth URLs, desktop/mobile triggers, all game dismissal methods, Auth tabs/links/keyboard, the seven-step history example, duplicate-state suppression, unrelated query updates, missing games, page 404, competing parameters, stale requests, rapid close/reopen, slider pause, and disposal.

The following command runs the dialog suite. `npm run` selects a package script; `test:dialogs` invokes `node --test` with the project's `--experimental-test-isolation=none` setup and `tests/dialog-routing/*.test.mjs` files. It runs tests without changing application source. Expected result: 18 passes, zero failures.

```bash
npm run test:dialogs
```

For the integrated project, the delivery guide lists all suites and expected totals. ESLint checks code rules; Prettier checks formatting without rewriting files; build checks TypeScript and generates production assets.

These tests use jsdom and controlled HTTP responses. Native focus trapping, painted animations, responsive appearance, gestures, real image loading, and the deployed host remain browser checks. The delivery package includes that checklist.

## Integration

Push this task branch and open a PR into `story-3` after reviewing the delivered code. Merge this task PR; leave the final `story-3 → story-2` cross-check PR unmerged. Features 1–8 were already present in the fetched remote when this final branch was prepared, so no earlier bundle needs to be re-imported for this package.

Commits created for this task use `Gafursz <gafurjon.sh@gmail.com>` as author and committer with actual creation timestamps. The recovered branch is based on the current remote history; no older dates or lost commit hashes are fabricated.
