# Story 4 — Feature 2: real-time auth form validation

## Result and scope

This feature implements the 30-point **RSS-QS-4-1-1** validation task on
`feature/auth-validation`. It extends the existing TypeScript classes, HTML string
rendering, and SCSS tokens. It adds no dependencies, UI framework, external router,
Firebase calls, session records, or authenticated API mutations.

The public GitHub check on **6 October 2026** found `story-3` at
`85b56dfe03beb93f51593157c303eb3452c2f8bd`, with no remote `story-4`,
`feature/test-foundation`, or `feature/auth-validation` branch. The local Feature 1
checkout was clean. Therefore this feature depends on the exact delivered Feature 1
tip, `a7e8ec1b1dd72eb7feb8238a937dbcd9ebb2ba22`; it does not pretend that Feature 1
was merged. Merge Feature 1's task PR into `story-4` before integrating Feature 2.

The Windows checkout at `C:\Users\User\Desktop\MiniGames-project` has not been
changed by this delivery. No branch was pushed and no GitHub PR was created or
merged. See the ZIP's `START-HERE.md` and `PR-FEATURE-2.md` for the remaining steps.
The final **`story-4` → `story-3` Cross-Check PR must remain unmerged**.

## The rules and their observable behavior

| Field                 | Requirement                                                                     | Example                                                                  |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Email, both modes     | Required; common valid email format                                             | `alex+games@example.com` is valid; `alex@` is not.                       |
| Registration username | 2–30 characters; first character uppercase English; English letters/digits only | `A1` and `CozyGamer99` are valid; `CozyGamer_99` is not.                 |
| Registration password | At least 6 characters, including uppercase English, a digit, and a symbol       | `Abcd1!` is valid; `abcdef` is not.                                      |
| Confirmation          | Required and exactly equal to the registration password                         | Case and whitespace differences do not match.                            |
| Login password        | Required and at least 6 characters                                              | `abcdef` is valid input even though it would fail registration strength. |

These are input checks, not proof of identity. A valid form still shows the existing
message that account sign-in is coming in a later update. It does not create an
account, sign in, set a session, or contact Firebase. Request locking and Firebase
error/success handling will be implemented with the actual authentication flow.

The old registration examples were corrected: the username placeholder is now
`CozyGamer99`, and the password placeholder says **6**, not 8, characters. Visible
hints explain the username and password rules before an error occurs.

## What each file does and why

| File                                                    | Responsibility and reason                                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/auth-dialog/auth-validation.ts`           | Pure rules returning error strings. The same rules determine inline feedback and whether submission is allowed. Pure functions are easy to test without a browser or credentials.                 |
| `src/features/auth-dialog/auth-form-validation.ts`      | One controller per form. It reads values, tracks visited/edited fields, listens to input/change/blur, updates errors and the submit button, and removes its listeners on destruction.             |
| `src/features/auth-dialog/auth-form.ts`                 | Keeps the existing field definitions and rendering approach. Adds hints, error elements, accessible descriptions, minimum lengths, corrected placeholders, and initially disabled submit buttons. |
| `src/features/auth-dialog/auth-dialog.ts`               | Owns the controllers, checks submissions, and resets them when the mode changes or the dialog closes. Existing routing actions, animation, and focus behavior remain in this class.               |
| `src/features/auth-dialog/auth-dialog.scss`             | Styles hints and errors, including the invalid border. Long feedback wraps inside the existing responsive, scrollable dialog.                                                                     |
| `src/features/auth-dialog/_auth-tokens.scss`            | Adds the named feedback line-height token. Colors, spacing, typography, borders, and breakpoints reuse existing tokens.                                                                           |
| `tests/auth-validation/auth-validation.test.ts`         | 43 rule cases covering valid inputs, invalid inputs, exact matching, and boundaries.                                                                                                              |
| `tests/auth-validation/auth-dialog-validation.test.mjs` | 14 DOM cases covering event behavior, submission, accessibility, resets, focus, cleanup, and no fake authentication. Uses the existing jsdom helpers.                                             |
| `tests/dialog-routing/dialog-routing.test.mjs`          | Updates the Story 3 mode-switch assertion for Story 4, strengthens history/unrelated-URL checks, and adds one direct URL reset case.                                                              |
| `README.md` and this guide                              | Explain the current feature, verification snapshot, dependency, and remaining integration.                                                                                                        |

`AuthMode` remains the existing `'login' | 'register'` type. The new `AuthFieldName`
union prevents misspelled field names. `AuthValues` and `AuthErrors` map those names
to strings. Empty error strings mean a field passed validation. Login deliberately
returns empty username/confirmation errors because those fields are not required
in that mode.

## How an edit moves through the code

When an input emits `input`, `change`, or `blur`, the form controller identifies the
field and marks it as touched. It reads the current values and calls
`validateAuthForm`. It then writes error text with `textContent`, updates
`aria-invalid`, and enables the submit button only if every active-form field passes.

All fields are checked from the beginning, so an empty form cannot submit. Error
messages are initially empty to avoid showing errors before the user has interacted.
An edited field or one left empty on blur shows its error immediately. Correcting
the value clears the error without a submit, mode change, or page reload.

Every event recomputes the form's rules, including confirmation. If a password
changes after confirmation has a value, a mismatch is shown immediately and the
submit button becomes disabled. An untouched, still-empty confirmation stays quiet
until visited, while still keeping the form invalid. Confirmation checks only
presence and equality: matching a weak password clears the confirmation error,
but the original password error still blocks the form.

The blur listener uses capture because native `blur` does not bubble. Input and
change use normal bubbling. These listeners are attached with an `AbortController`,
so destroying or rebinding a dialog removes them rather than stacking handlers.

At submission, `AuthDialog` first prevents default browser navigation. A hidden
form, closed dialog, or dialog in its closing animation cannot submit. The active
form is validated again against its current values. This catches values changed
programmatically without an input event and does not rely only on the button's
disabled state. An invalid attempt reveals the relevant errors and focuses the
first invalid field. A valid attempt reaches only the existing future-auth message.

## Why mode changes reset, but unrelated URL updates do not

Story 3 preserved typed values between Login and Register. Story 4 explicitly
requires clearing them. The implementation checks whether the mode actually
changed and resets **both** forms only for that change. Resetting clears values,
touched state, error text, invalid attributes, and submit readiness. It also restores
the existing login password visibility toggle to its concealed state.

Tabs, inline links, keyboard controls, direct auth URLs, and browser Back/Forward all
reach the existing dialog mode method, so they share this reset behavior. Selecting
the current tab does not discard values. The existing app's dialog-state comparison
preserves the form when a tracking parameter or Library category changes while the
auth mode remains the same. Tests check values, errors, submit readiness, and focus.

Focus ordering matters: moving focus away from the previous input can emit blur.
The reset runs **after** that focus movement. Otherwise blur could recreate a
required-field error immediately after resetting the form. Closing likewise clears
validation after returning focus to the trigger. These paths have regression tests.

Neither passwords nor form values are put in the URL, localStorage, or logs. The
router continues to store only the existing public dialog mode state.

## Input-format decisions

- Email validation accepts common unquoted ASCII addresses, aliases, and subdomains.
  It rejects missing parts, whitespace inside the address, consecutive dots in the
  local part, and malformed domain labels. It checks format, not mailbox ownership.
  Outer email whitespace is ignored for this check; the validator does not mutate
  input values. Internationalized or quoted local parts are outside this practical
  form format. The future auth provider remains authoritative about real accounts.
- Usernames are not trimmed or silently changed. Spaces and underscores are invalid,
  and a lowercase first letter is explained rather than automatically capitalized.
- Registration symbols are visible ASCII punctuation, such as `!`, `@`, `_`, and
  `~`. Spaces, control characters, and non-English letters do not satisfy the allowed
  character set. Passwords are never trimmed or normalized. Login applies only the
  required/minimum-length rules, without adding registration character restrictions.
- Confirmation equality is literal. It has no separate strength check or minimum
  length rule, so a mismatch cannot be hidden by validating it as another password.

## Accessibility and SCSS choices

Every field retains a visible label, correct input type, required attribute, and
autocomplete purpose. Password and username minimum lengths are also represented
in markup. The form keeps `novalidate` so native popups do not compete with custom
inline feedback.

Each input's `aria-describedby` references its hint, where present, and a stable
error element. Error elements use `aria-live="polite"` and `aria-atomic="true"`.
They remain in the DOM even when empty. `aria-invalid` changes with visible errors.
Error text explains the problem, so the red border is not the only signal. Typing
and correcting fields does not move focus; invalid submission can focus the first
invalid input.

The error color uses `tokens.$color-error`; spacing and font sizes use the existing
tokens. The focus ring remains visible on an invalid field. Feedback wraps, and the
existing dialog width, maximum viewport height, scrolling, animations, reduced
motion treatment, and breakpoint mixins are preserved. No layout is replaced with
an image.

DOM tests verify labels, descriptions, states, focus, and reset behavior. They do
not prove screen-reader announcements, native dialog top-layer behavior, browser
autofill event timing, or mobile pixel rendering. Those manual checks remain listed
below; no Figma or native-browser verification is claimed for this delivery.

## Verification evidence

The completed run on 6 October 2026 used **Node 24.19.0** and **npm 11.9.0**.
Both normal and coverage runs passed **191 tests across 18 files**, with zero failed,
skipped, or todo cases. This is Feature 1's 133 cases plus 58 new cases. The existing
mode-switch expectation was deliberately revised, not removed or skipped.

| Metric     | Covered / total | Result |
| ---------- | --------------- | ------ |
| Statements | 1393 / 1565     | 89%    |
| Branches   | 844 / 1034      | 81.62% |
| Functions  | 286 / 307       | 93.15% |
| Lines      | 1273 / 1384     | 91.97% |

All **48** non-declaration `src/**/*.ts` files remain in the coverage report,
including the bootstrap and lower-coverage gesture code. The configuration and
80% aggregate statement gate are unchanged. No application logic was excluded to
raise coverage. The ZIP includes raw command logs, JSON test results, a source
coverage audit, and an HTML report at `coverage-report/index.html`.

The focused tests cover username lengths 1/2/30/31, registration password lengths
5/6, each missing strength requirement, login without registration strength, empty
and mismatched confirmation, and password changes after a matching confirmation.
UI tests use the real form controllers and dialog. Existing routing integration
tests use mocked public API responses; unexpected network calls are blocked by
shared test setup. No live credentials or Firebase mocks are needed yet because
this feature imports no Firebase code.

## Commands, explained before running

Run these from the repository root after following `START-HERE.md`. The delivered
`project/` is also a complete source snapshot for a separate inspection copy.

`npm ci` installs exact lockfile dependencies and replaces the local `node_modules`
directory. It does not update source or dependency versions. Use the supported Node
range in `package.json`; installation may configure the existing Husky hooks.

```bash
npm ci
```

`npm test` runs the complete Vitest suite once and exits. It fails if any assertion
fails. Expect 191 passing tests for this exact snapshot.

```bash
npm test
```

`npm run test:coverage` runs the same suite with V8 measurement, prints the source
coverage table, writes `coverage/index.html`, and fails below 80% statements.

```bash
npm run test:coverage
```

`npx --no -- vitest` uses the installed test runner without installing a missing
package. `run` means one execution; the two paths select the new validation tests
and dialog routing regressions. This focused run has 76 cases and is useful while
editing; the full coverage command is still the final gate.

```bash
npx --no -- vitest run tests/auth-validation/ tests/dialog-routing/
```

`lint` runs ESLint without rewriting files. `format:check` checks Prettier formatting.
`typecheck:tests` checks TypeScript application/test/config files with no JS output;
the `.mjs` DOM tests are linted and executed rather than TypeScript-checked.
`typecheck:feedback` retains the earlier focused compiler check. `build` checks app
types, builds production files under `dist/`, and creates the existing SPA fallback.

```bash
npm run lint
npm run format:check
npm run typecheck:tests
npm run typecheck:feedback
npm run build
```

`npm run dev` starts Vite's development server. Open the exact local URL it prints
(including the configured `/Minigames/` base). Press Ctrl+C to stop the server.

```bash
npm run dev
```

## Manual review to complete after import

1. At mobile, tablet, and desktop widths, open Login. Verify hints and errors wrap,
   the dialog scrolls when needed, and no horizontal overflow appears.
2. Leave email empty, then type an invalid email. Correct it and enter `abcdef` as
   the login password. The error clears and Login becomes enabled.
3. Switch to Register. Fields should be empty, errors cleared, and Create Account
   disabled. Try `CozyGamer_99`, then correct it to `CozyGamer99`.
4. Enter a valid email, `Abcd1!`, and matching confirmation. Change the original
   password to `Other2!`. Confirm that mismatch feedback appears immediately.
5. Switch with tabs, inline links, keyboard controls, and Back/Forward. Actual mode
   changes clear the form; unrelated query changes preserve it. Escape/backdrop
   dismissal, opening/closing animations, and return focus should still work.
6. Check keyboard navigation and screen-reader error announcements. Try your
   browser/password manager's autofill. Valid submission must not claim to sign in:
   Firebase is deliberately not connected in this feature.

## Official reference

[RSS-QS-4-1-1: Auth Forms Real-time Validation](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/tasks/story-4/RSS-QS-4-1-1-auth-forms-realtime-validation.md)
was fetched and checked on 6 October 2026. Future task changes require a new review;
this document records the requirements and implementation for this delivery.
