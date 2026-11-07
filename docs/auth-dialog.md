# Auth dialog — Story 1 layout

This feature adds the Login and Register dialog to the existing TypeScript SPA.
It uses the existing header, SCSS tokens, breakpoint mixins, Inter fonts, and
native `<dialog>` element. There is no authentication service or validation-error
UI in this layout task.

## Files and responsibilities

| File                                         | Responsibility                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/features/auth-dialog/auth-dialog.ts`    | Open/close lifecycle, keyboard tabs, inline switching, password visibility, focus restoration, and cleanup. |
| `src/features/auth-dialog/auth-form.ts`      | Typed field definitions and semantic Login/Register markup.                                                 |
| `src/features/auth-dialog/auth-dialog.scss`  | Responsive layout, interaction states, tab movement, and dialog/panel animations.                           |
| `src/features/auth-dialog/_auth-tokens.scss` | Auth-specific dimensions and animation values, composed with the shared tokens.                             |
| `src/components/header.ts`                   | The four auth triggers and simultaneous mobile-menu dismissal.                                              |
| `src/app/app.ts`                             | One shared auth dialog across Home and Library; pauses the carousel while open.                             |
| `src/styles/main.scss`                       | Imports the auth SCSS through `@use`.                                                                       |
| `tests/auth-dialog.test.mjs`                 | Seven auth behavior tests using the existing DOM harness.                                                   |

`@include breakpoints.tablet { ... }` inserts the media query from
`src/styles/_breakpoints.scss`. The auth stylesheet follows the existing SCSS
module pattern rather than adding a CSS framework.

## Behavior

- Header Login opens Login; Sign Up opens Register.
- The equivalent mobile-menu buttons open the same dialog and close the menu.
- Native `showModal()` supplies the top layer and focus containment. The backdrop
  and Escape dismiss either variant with an exit animation.
- Tabs and footer links switch variants without changing the route. Left/Right
  arrows and Home/End operate the tabs; only the selected tab is in the tab order.
- Draft input stays when switching variants, then resets when the dialog closes.
- The Login eye button toggles password visibility and its accessible label.
- Desktop focus returns to the trigger. Mobile focus returns to the burger, since
  the original button is now inside a hidden menu.
- Forms prevent submission/navigation. Login/Create Account, Google, and password
  recovery display a short availability message; they do not claim successful
  authentication, send credentials, or persist passwords.
- `novalidate` intentionally defers error states to the later validation task.
  Inputs still have real labels, names, types, required semantics, and autocomplete.
- Reduced-motion preferences disable motion. A short viewport scrolls the dialog
  vertically; the body stays locked until the dialog closes.

## Figma references and assets

File: https://www.figma.com/design/3I6Lr2eZ6Mn7LaL9op9PmX/MiniGames--Copy-

- Login: node `2:1327`, 420 × 623.
- Register: node `2:1363`, 420 × 768.
- Desktop/tablet target width: 420px. Mobile uses the available width with a 16px
  viewport margin on each side.

Both layout contexts and screenshots were retrieved. The Figma service then
reported its Starter-plan tool limit for the input and tab state-guide requests.
Its temporary SVG downloads also returned HTML rather than usable assets.

The Google logo is the matching flat-color mark from the official Firebase UI
asset library, stored locally and left unmodified:
https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg
Its original 118 × 120 SVG is scaled uniformly inside a 24px slot; the SVG's root
size and aspect ratio are preserved. The grey divider is a CSS rule.

The mail, lock, person, and visibility glyphs use a local Material Symbols
Outlined subset at optical size 20 and weight 400. Font source:
https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&icon_names=lock,mail,person,visibility&display=block
The Apache license is included beside the font. No temporary Figma URLs or
runtime font-download requests are used.

## Verification

Passed during implementation:

- `npm test`: 18 tests, including 7 auth tests and 11 existing Story 2 tests.
- `npm run lint`.
- `npm run format:check`.
- `npm run build` (TypeScript plus Vite/Sass).
- W3C Nu HTML Checker: no errors or warnings for complete generated Library-page
  DOM snapshots with Login open and Register open. The snapshots were produced
  by the DOM test harness, not copied from a real browser.

The DOM test environment has no layout or native top-layer rendering engine;
its dialog methods are stubbed. These tests prove interaction logic, not pixel
alignment, browser focus containment, or visual animation quality.

Local browser preview was blocked in this environment. A Pixel Perfect pass or
50/50 score has **not** been verified. Check these in your browser before scoring:

1. At 1920px and 768px, compare both 420px dialogs with their Figma frames.
2. At 375px, check text wrapping, the Google button, and absence of horizontal
   scrolling. At a short viewport, verify vertical scrolling and backdrop access.
3. Check default, hover, pressed, keyboard-focus, and disabled styling against
   the style guide. Input/tab focus colors still need that visual comparison.
4. Exercise all four triggers, both inline links, tab keys, Escape, backdrop,
   password visibility, and repeated reopening.
5. If you change the markup, repeat W3C validation using the actual rendered
   browser document for each variant.

The existing unfinished Story 2 footer work is outside this auth change.
