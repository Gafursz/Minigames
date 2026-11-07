# Story 3, Stage 2: shared UI feedback

## What this feature delivers

Branch: `feature/ui-feedback`. Base: the merged API feature on `story-3` at
`47e5e7aac7965061aadd4de905e9ab16aba67699` (Pull Request #2).

API requests need four visible outcomes: loading, usable content, an empty result,
and a failure. This feature adds reusable components for these outcomes plus a
Snackbar for short notifications. Future Home, Library, and Game Details features
will connect them to the API client.

The production pages still use their existing Story 2 behavior. This feature does
not yet fetch data in those pages, change the router, or enable authenticated
actions. The development preview is the place to exercise the new components now.

The implementation uses the project's existing TypeScript classes, HTML strings,
SCSS partials, `@use`, design tokens, and breakpoint mixins. There is no new runtime
dependency. `jsdom` is a development dependency used only for DOM behavior tests.

## Requirements covered by the foundation

| Requirement                                      | Implementation                                 | Integration remaining                          |
| ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| Animated placeholders while a request is pending | Five skeleton layouts in `ContentFeedback`     | Call them before each page request             |
| Block-level failure with Retry                   | Error banner with a supplied retry callback    | Supply the actual failed request callback      |
| Distinct successful empty result                 | Separate empty-state markup, role, and styling | Choose the correct empty text for each section |
| Shared success/error notifications               | Exported `snackbar` instance                   | Trigger it for relevant API events             |
| Automatic dismissal and non-blocking feedback    | Six-second timer and manual popover            | Connect notifications to production API flows  |
| Consistent feedback across sections              | Shared markup, styles, and tokens              | Connect each section in its feature branch     |

These shared components are preparation for the scored API tasks. Their existence
alone does not mean those tasks are complete. Story 3's shared feedback rules give
students visual design freedom; these components do not claim a Figma pixel match.

## Files and responsibilities

| File                                           | What changed and why                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/components/content-feedback.ts`           | Owns the content area's loading/error/empty/ready UI and Retry listeners          |
| `src/components/snackbar.ts`                   | Owns one reusable notification, its timer, dismissal, and focus handling          |
| `src/styles/components/_content-feedback.scss` | Skeletons and banners, using existing tokens and breakpoint mixins                |
| `src/styles/components/_snackbar.scss`         | Notification position, wrapping, variants, entrance animation, and reduced motion |
| `src/styles/_tokens.scss`                      | Named values for feedback sizes, motion, success color, and touch targets         |
| `src/styles/main.scss`                         | Loads both SCSS partials with `@use`                                              |
| `src/utils/html.ts`                            | Provides the existing HTML escaping function without loading game images          |
| `src/utils/game.ts`                            | Re-exports that function so existing imports still work                           |
| `tests/feedback/*.test.mjs`                    | Automated tests for retry, safe text, timers, and cleanup                         |
| `tests/feedback/dom.mjs`                       | Supplies and restores a DOM for each Node test                                    |
| `tests/feedback/index.html` and `preview.ts`   | Interactive development checks for all component states                           |
| `tests/feedback/frame.html` and `frame.ts`     | Isolated 375px/768px preview viewports                                            |
| `tests/feedback/preview.scss`                  | Styles only the development preview controls                                      |
| `tsconfig.feedback.json`                       | Type-checks the preview TypeScript alongside production code                      |
| `package.json` and `package-lock.json`         | Pin the DOM test dependency and add the test/type-check commands                  |
| `README.md`                                    | Records the current Story 3 progress and links to this guide                      |

## How ContentFeedback works

Create one instance for each content region. The region should be a container such
as a `div` inside a section, not a `tbody` or another element that requires special
children.

```ts
const root = document.querySelector<HTMLElement>('#games-content');
if (!root) throw new Error('Games content container is missing.');
const feedback = new ContentFeedback(root);

feedback.showLoading('cards', 'Loading games…');

feedback.showEmpty({
  title: 'Data Not Found',
  message: 'No games match these filters. Try another category.',
});

feedback.showError({
  title: 'Unable to load games',
  message: 'The server could not be reached. Please try again.',
  onRetry: loadGames,
});
```

This is a usage example, not code already connected to the Library page.
`loadGames` is the page's request function, to be added in the Library API feature.

`showLoading()` marks the container `aria-busy="true"` and renders placeholders.
The layout choices are `cards`, `slider`, `leaderboard`, `details`, and `comments`.
Their counts are six cards, three slider placeholders, five leaderboard rows,
one details block, and three comments. These counts describe loading placeholders;
they do not filter, sort, or paginate server data.

`showEmpty()` represents a successful response with no items. It uses a status
region and has no Retry button. An empty response is not a network failure.

`showError()` replaces the region with an alert banner and a Retry button. The
component calls the supplied callback. It does not know which endpoint to fetch,
so the page keeps responsibility for its request parameters and rendering.

While that callback is pending, the Retry button is disabled and says `Retrying…`.
Repeated clicks therefore do not launch duplicate retries through that button. If
the callback throws, the banner displays the new message and enables Retry again.
If the callback renders another state, the obsolete error listener is removed.

`showContent(markup)` replaces the feedback with application-rendered HTML and
clears the busy flag. It deliberately accepts trusted rendered markup. Escape API
strings in the renderer before interpolating them into this markup.

### Event cleanup and request ownership

Each error state owns an `AbortController` for its event listener. Replacing the
state calls `abort()` to remove the obsolete listener. The retry handler also
checks this signal before updating an old error banner after an asynchronous
failure.

This controller does **not** cancel network requests. The page must use its own
request controller, pass its signal to the Stage 1 API client, and ignore stale
responses when navigating or changing filters. A late successful callback can
still overwrite newer content if its caller fails to implement that protection.

Call `feedback.destroy()` when the page or region is disposed. It removes Retry
listeners and feedback attributes; it does not remove the container or its HTML.
The page owns that container and replaces or removes it during navigation.

### Safe text

Banner titles, messages, and loading labels pass through `escapeHtml()`. This
converts characters such as `<`, `>`, and `&` into HTML entities. An API message
containing `<img ...>` is displayed as text rather than creating an image element.
Retry error messages use `textContent` for the same reason.

The escaping function previously lived in `utils/game.ts`, next to an eager Vite
image import. Moving it to `utils/html.ts` lets feedback and Node tests use this
small text helper without importing the game image collection. The old module
re-exports it, preserving the existing game component imports.

## How the Snackbar works

Import the shared instance wherever a short API-related notification is needed:

```ts
import { snackbar } from '../components/snackbar';

snackbar.show('Games loaded successfully.');
snackbar.show('Unable to load comments. Please try again.', 'error');
snackbar.dismiss();
```

The default variant is `success`; the other required variant is `error`. Different
border colors and symbols distinguish them without relying only on color.
The `snackbar--success` and `snackbar--error` modifiers match the BEM markup used
in the Windows implementation. The symbol, message, and close button are direct
children of the Snackbar. Message text is assigned with `textContent`.

The component creates its DOM element only when the first message is shown. It
reuses that element for later messages. A new message replaces the old one and
receives a fresh six-second timeout. Clearing the previous timer prevents it from
dismissing the replacement too early. Blank messages are ignored.

The close button dismisses the notification immediately. Showing a notification
does not move keyboard focus. If focus is inside the notification when it closes,
the component tries to return it to the previously focused connected element.
It does not move focus when the user is already interacting elsewhere.

The notification uses a manual popover in supporting browsers. A popover can sit
in the browser's top layer without opening another modal or freezing the page.
When a dialog is open, the notification is placed inside it so that the dialog's
inert background does not also make the notification's close button inert. Closing
that dialog dismisses its notification. An ordinary fixed-position fallback is
used when the Popover API is unavailable. The `popover` attribute is only added
when both API methods exist. Otherwise the browser's default styling could keep
the notification hidden even after the component removes its `hidden` attribute.

The DOM nodes are reused rather than replaced on every message. This preserves
keyboard focus if the close button is focused when a new notification arrives.

The native popover behavior still needs the Chrome check described below. The DOM
test environment does not implement browser top-layer rendering or modal focus.

`snackbar.destroy()` clears the timer, removes the dialog-close listener, and
removes the element. The instance can be used again afterward.

## How the SCSS follows the project

The new partials use `@use '../tokens'` and, where needed, `@use '../breakpoints'`.
For example, `tokens.$size-2` refers to the existing spacing scale. The new
`$touch-target` is 2.75rem (44px at the default root size), and the notification's
maximum width is a named token rather than a repeated literal.

`@include breakpoints.tablet` inserts the media query defined by the existing
tablet mixin. The cards skeleton becomes a horizontal image/text row there. At
the existing wide breakpoint, the cards use two columns. This keeps responsive
rules in the same method used by the Story 1/2 styles.

Skeleton bars animate a gradient across their surface. The Snackbar fades and
moves into place. Both animations are disabled under `prefers-reduced-motion`.
Long text wraps, and the Snackbar has a viewport-based maximum width and height.
It can scroll internally if an unusually long message exceeds the available height.

## Verification completed

The following commands passed during this feature's verification:

| Command                      | Result                                   |
| ---------------------------- | ---------------------------------------- |
| `npm run test:api`           | 17 existing API tests passed             |
| `npm run test:ui`            | 17 feedback tests passed                 |
| `npm run typecheck:feedback` | Production and preview TypeScript passed |
| `npm run lint`               | No ESLint errors                         |

| `npm run format:check` | Prettier passed |
| `npm run build` | TypeScript and Vite production build passed |
| `git diff --check` | No whitespace errors |

The UI tests cover all five skeleton layouts, the distinction between errors and
empty data, literal text safety, duplicate retry clicks, failed retries, listener
cleanup, a late failed retry, success/error notification roles, automatic and
manual dismissal, replacement timers, dialog-host lifecycle events, recreation
after cleanup, and blank-message handling. They also check focus during message
replacement and after moving to another control, compiled SCSS for the BEM
variants, and popover API call order when moving between page and dialog hosts.

Tests use Node's built-in test runner and jsdom. Node's mocked timers let tests
advance six seconds instantly and deterministically. The timers in the actual
application still use real time. These tests do not make real API requests.
The SCSS test compiles the actual partial with Sass and checks computed styles in
jsdom. It caught the unsupported-popover visibility problem. It verifies selector
compatibility, not viewport dimensions or visual layout. Popover methods in one
test are fakes; that test does not verify Chrome's native top layer.

### Browser checks still required

The available preview browser could not open the local development server and
returned `net::ERR_BLOCKED_BY_CLIENT`. No screenshot, native popover test, visual
animation check, or responsive rendering check is claimed as completed. jsdom
does not supply those checks.

To perform them locally:

1. Run `npm ci`, then `npm run dev`.
2. Open `/Minigames/tests/feedback/index.html` on the local server address printed
   by Vite. With its default port, use
   `http://localhost:5173/Minigames/tests/feedback/index.html`.
3. Click every skeleton control and check the animation. Turn on reduced-motion
   emulation in Chrome and confirm it stops.
4. Show an error and click Retry repeatedly. One retry should run while the button
   is disabled. Check the successful and failed retry examples.
5. Show the empty state and confirm it is visibly different from an error and has
   no Retry button.
6. Show success and error notifications. While one is visible, use the page's
   interaction button, scroll, and navigate with Tab. Check manual close and the
   six-second automatic close.
7. Use the replacement notification control. The second message appears after
   three seconds and should remain for its own six seconds.
8. Open the test dialog, then show its notification. Check its visibility and
   close button above the dialog. Closing the dialog should clear the notification.
9. Use the literal-markup control. The markup must remain readable text, and no
   image or bold element should be created from the message.
10. Open both iframe widths, 375px and 768px. Also use Chrome's device toolbar on
    `frame.html` at 1920px and resize between the required widths. Test long
    messages and check for unintended horizontal scrolling inside the frame.
11. Confirm keyboard focus remains visible and returns sensibly after closing a
    focused notification. Screen-reader announcement quality needs a real assistive
    technology check as well.

The preview HTML pages are not production Vite entry points, so they are excluded
from the normal `npm run build` output. They intentionally simulate UI states and
do not claim to be real API integrations.

## Commit and integration approach

The feature is split into meaningful commits for content states, Snackbar,
verification, and documentation. New commits use `Gafursz
<gafurjon.sh@gmail.com>` as author and committer, with actual creation timestamps.
The working preference is about 60–90 minutes per feature, including development,
testing, review, and explanation. It is not a minimum gap between commits, and
commit timestamps are not a measurement of active working time.

Import or push this feature, complete the outstanding Chrome checks, and create a
task PR from `feature/ui-feedback` into `story-3`. Merge that task PR after review.
Then start `feature/spa-router` from the updated `story-3`.

The final cross-check PR at the end of the whole story is `story-3` into `story-2`.
That final PR must remain unmerged for cross-check review.

## Official references

- [Shared loading, error, and empty-state requirements](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/common-skeleton-loaders-error-empty-states.md)
- [Shared Snackbar requirements](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/common-snackbar-notification-requirements.md)
- [Story 3 scoring scope](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-3/common-no-pixel-perfect-scoring.md)
- [Project and branch workflow requirements](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/common-project-requirements.md)
- [jsdom documentation and its limitations](https://github.com/jsdom/jsdom)
