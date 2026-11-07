# Feature 3: custom SPA router foundation

## What changed

The application now uses the browser History API and normal paths instead of hash-only page navigation. The existing TypeScript classes, HTML render methods, SCSS tokens, and breakpoint mixins remain in use. No routing dependency was added.

With the configured Vite base `/Minigames/`, Home is `/Minigames/` and Library is `/Minigames/library`. `/home` and trailing slashes are accepted and normalized within that base. Unknown paths display a dedicated 404 page with the shared header/footer and a working Home link.

This feature is the **foundation**, not completion of the entire 80-point URL-synchronization criterion. The parser understands Library and dialog parameters, but connecting those values to API-backed controls and opening/closing dialogs belongs to later feature branches. Existing dialogs still open through the existing buttons; `?game=` and `?auth=` do not yet open them.

## How it works, file by file

| File                                                                                  | Responsibility and reason                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/router/route.ts`                                                                 | Converts a URL into typed page, Library, and dialog state. Pure functions make normalization and query preservation testable without a browser.                                                                                                |
| `src/router/router.ts`                                                                | Owns `pushState`, `replaceState`, and the `popstate` listener. The URL is read again for every navigation instead of maintaining a second competing page state.                                                                                |
| `src/router/links.ts`                                                                 | Generates links under Vite's deployment base and recognizes ordinary clicks on marked internal links. Modified clicks, downloads, external links, and links opening another tab keep their native behavior.                                    |
| `src/app/app.ts`                                                                      | Creates the selected page, tears down the old page/dialogs, binds the new page, updates the document title, and focuses its heading after page navigation. Query-only changes reuse the page instance through the optional `updateRoute` hook. |
| `src/types/page.ts`                                                                   | Adds that optional route-update hook for later Library work.                                                                                                                                                                                   |
| `src/components/header.ts`                                                            | Uses real page URLs and aborts old event listeners when a page is destroyed. This prevents detached mobile menus from retaining document listeners.                                                                                            |
| `src/components/footer.ts`, `src/components/hero.ts`                                  | Use the same internal-link convention.                                                                                                                                                                                                         |
| `src/pages/home-page.ts`, `src/pages/library-page.ts`                                 | Dispose of their header listeners when leaving the page.                                                                                                                                                                                       |
| `src/pages/not-found-page.ts`                                                         | Renders a safe, semantic 404 page. It does not insert the unknown path as HTML.                                                                                                                                                                |
| `src/styles/pages/_not-found.scss`, `src/styles/_tokens.scss`, `src/styles/main.scss` | Add responsive 404 styling using the existing SCSS method.                                                                                                                                                                                     |
| `scripts/copy-spa-fallback.mjs`, `package.json`                                       | Copy the built entry page to `dist/404.html` after a successful production build, for GitHub Pages deep links.                                                                                                                                 |
| `tests/router/`, `tests/helpers/`                                                     | Cover the URL parser, history, link interception, and actual App integration using Node tests, Vite transforms, and jsdom.                                                                                                                     |

## Navigation and history

1. A regular click on `data-router-link` is intercepted only when its URL belongs to this application.
2. `navigate()` writes a history entry and renders the URL. `pushState()` itself does not fire `popstate`, so rendering is explicit.
3. Browser Back/Forward fires `popstate`; the router reads and renders that URL without adding another entry.
4. Clicking the already-current URL is a no-op. Invalid values and legacy URLs are normalized with `replaceState`, so corrections do not create extra Back steps.
5. Leaving a page aborts its listeners and destroys its owned components. Once Feature 4 is included, that also cancels Home API requests and timers.

Normal page navigation scrolls to the top. History traversal is left to the browser's native scroll restoration. The new page heading receives focus without an extra scripted scroll.

Your seven-step dialog example is covered at the **URL/history mechanism** level: seven explicit query changes can be traversed backward and forward in order. The visible dialogs will participate after the planned dialog URL-sync feature is implemented. The test does not claim the current dialog close button already writes a URL.

## Query rules prepared for later features

- Default Library sort: `rating-desc`; default page: `1`. Default values are omitted from the normalized URL.
- Unsupported sorts, non-integer pages, zero, negatives, and unsafe integers normalize to their defaults.
- A nonempty unknown category is preserved for the backend to handle. It is not silently replaced with a different category.
- `game` represents a slug; `auth=login` and `auth=register` are recognized. Auth takes priority if both dialog parameters are present.
- Unrelated query parameters are preserved when changing a known parameter.
- Old shared links such as `/Minigames/#/library?page=2` migrate once to `/Minigames/library?page=2`.
- An unknown page is a page 404; an unknown game on a valid page will be a dialog state in the later Game Details feature.

## Hosting and direct links

`npm run build` runs TypeScript, Vite, and then the `postbuild` script. The resulting `404.html` is identical to `index.html`. GitHub Pages can serve that file when someone directly opens or refreshes `/Minigames/library`; the loaded app then reads the original URL.

GitHub Pages still sends HTTP **404** for those fallback requests. This is a static-host limitation, not a promise of a server-side 200 rewrite. A host with rewrite rules should instead serve `index.html` for application routes. Deployment at a domain root needs `base: '/'` in Vite; this feature preserves the existing `/Minigames/` base.

The existing deployment workflow still targets `story-2`. This feature does not automatically publish `story-3`. Use the workflow's manual dispatch with the intended branch when ready, and keep the final cross-check PR unmerged.

## Verification and what each command means

```bash
npm ci
npm run test:router
npm run test:api
npm run test:ui
npm run typecheck:feedback
npm run lint
npm run format:check
npm run build
```

`npm ci` installs the locked dependencies. `test:router` runs 15 parser/history/App tests. The API and feedback suites catch regressions in the merged foundations. `typecheck:feedback` checks the existing feedback preview TypeScript. Lint and format check the project's code rules. Build checks production TypeScript/assets and creates the fallback file.

Automated tests use jsdom and mocked browser APIs. They do not verify actual Chrome rendering, gesture physics, native dialog animation, or GitHub Pages HTTP behavior. Check these manually after importing:

1. Use `npm run dev` and open the printed `/Minigames/` URL.
2. Navigate Home → Library → Home; verify the page changes without reloading the document.
3. Open Library directly and refresh it. Test the published deep link separately after deployment.
4. Open `/Minigames/something-missing`, then follow its Home link.
5. Use Back/Forward repeatedly, including a 404 visit. Try Ctrl/Cmd-click on a normal navigation link.
6. Test the mobile menu at 375px and 768px, then at desktop width. Open and close existing dialogs after each page change.

## Integration

This branch is based on merged `story-3` commit `1cbafb36e3df0d8ada21749563ec0922bbbb4caa`. Push `feature/spa-router`, open a task PR into `story-3`, review it, and merge that task PR. Feature 4 uses the same common base and is delivered separately. Do not merge the final `story-3 → story-2` cross-check PR.

Commits use `Gafursz <gafurjon.sh@gmail.com>` and their actual creation times. No dates are fabricated or adjusted to imply a longer work session.
