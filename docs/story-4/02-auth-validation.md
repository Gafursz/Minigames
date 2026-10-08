# Story 4 — Feature 2: Real-Time Authentication Form Validation

## 1. Feature overview

Feature 2 implemented real-time validation for the Login and Registration forms in MiniGames Story 4.

The implementation addresses **RSS-QS-4-1-1: Auth Forms Real-Time Validation**, worth 30 points.

The feature was developed on `feature/auth-validation`, building on the completed Feature 1 testing foundation.

It was successfully merged into `story-4` through [Pull Request #17](https://github.com/Gafursz/Minigames/pull/17).

The implementation extends the existing TypeScript classes, HTML rendering functions, and SCSS architecture without adding dependencies, UI frameworks, or external routing libraries.

Firebase authentication and authenticated API mutations were intentionally outside this feature's scope.

## 2. Completed implementation

The following functionality was implemented:

- Real-time validation for Login and Registration fields.
- Required-field and email-format validation.
- Username validation for registration.
- Separate password rules for Login and Registration.
- Exact password confirmation.
- Immediate revalidation when passwords change.
- Inline validation errors and explanatory input hints.
- Disabled submission buttons when forms are invalid.
- Full form revalidation on submission.
- Automatic clearing of fields and errors when switching authentication modes.
- Preservation of form values when unrelated URL parameters change.
- Accessible validation markup and error announcements.
- Integration with the existing authentication dialog and custom SPA routing.
- Figma-related correction of the focused input appearance.
- Automated tests for validation rules, DOM behavior, and dialog navigation.

## 3. Validation rules

The validation requirements differ between Login and Registration.

| Field                 | Requirement                                                                                    | Example            |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| Email — both modes    | Required; valid email format                                                                   | `alex@example.com` |
| Registration username | 2–30 characters; begins with uppercase English letter; English letters and digits only         | `CozyGamer99`      |
| Registration password | At least 6 characters, including an uppercase English letter, a digit, and a special character | `Abcd1!`           |
| Confirm password      | Required; must match registration password exactly                                             | `Abcd1!`           |
| Login password        | Required; minimum 6 characters                                                                 | `abcdef`           |

### Email validation

The email validator accepts common unquoted ASCII addresses, including aliases and subdomains.

It rejects missing address components, internal whitespace, consecutive dots in the local part, and malformed domain labels.

Leading and trailing whitespace is ignored during format checking, but the validator does not silently modify the input value.

The validation checks address format, not whether the mailbox exists.

### Username validation

Registration usernames must:

- Contain between 2 and 30 characters.
- Start with an uppercase English letter.
- Contain only English letters and digits.

Spaces, underscores, and lowercase initial letters are rejected.

For example, `CozyGamer99` is valid, while `CozyGamer_99` is invalid.

### Password validation

Registration requires at least six characters, including an uppercase English letter, a digit, and an ASCII punctuation symbol.

Registration passwords do not accept spaces, control characters, or non-English characters under the implemented character rules.

Login passwords are checked only for presence and minimum length. Registration strength rules do not apply to Login.

Passwords are not trimmed or automatically normalized.

### Password confirmation

Password confirmation checks required presence and exact equality with the registration password.

If the original password changes after confirmation has been entered, the confirmation field is immediately revalidated.

A matching confirmation does not make a weak registration password valid; the original password requirements remain independent.

## 4. Files created and modified

| File                                                    | Implementation and purpose                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/features/auth-dialog/auth-validation.ts`           | Implements pure validation functions and typed validation results.                                         |
| `src/features/auth-dialog/auth-form-validation.ts`      | Manages input events, touched fields, errors, form validity, and listener cleanup.                         |
| `src/features/auth-dialog/auth-form.ts`                 | Adds hints, error elements, accessible descriptions, minimum lengths, and disabled initial submit buttons. |
| `src/features/auth-dialog/auth-dialog.ts`               | Integrates validation controllers, submission checks, and form resets with existing dialog behavior.       |
| `src/features/auth-dialog/auth-dialog.scss`             | Styles validation feedback and the focused/error input states.                                             |
| `src/features/auth-dialog/_auth-tokens.scss`            | Adds the feedback line-height token.                                                                       |
| `tests/auth-validation/auth-validation.test.ts`         | Adds 43 validation rule tests.                                                                             |
| `tests/auth-validation/auth-dialog-validation.test.mjs` | Adds 14 DOM and interaction tests.                                                                         |
| `tests/dialog-routing/dialog-routing.test.mjs`          | Updates and extends tests for authentication mode changes and URL synchronization.                         |
| `README.md`                                             | Records the validation feature and verification results.                                                   |
| `docs/story-4/02-auth-validation.md`                    | Documents the feature's architecture, implementation, tests, and completion.                               |

## 5. How real-time validation works

The implementation separates validation rules from browser event handling.

### Validation functions

`auth-validation.ts` defines typed validation functions and data structures.

`AuthFieldName` identifies supported fields, and `AuthValues` and `AuthErrors` represent their values and corresponding validation messages.

The validation functions return error strings when input is invalid.

An empty error string represents a successful validation result.

### Form validation controller

`AuthFormValidation` manages each form's validation lifecycle.

It listens for three events:

- `input` — updates validation while the user types.
- `change` — handles value changes.
- `blur` — validates when the user leaves a field.

The `blur` listener uses event capture because native `blur` events do not bubble.

Each event triggers the same validation rules.

The controller updates error text using `textContent`, changes `aria-invalid`, and enables or disables the submit button according to the active form's validity.

### Touched-field behavior

All required values are checked when determining whether a form can submit.

However, error messages are not displayed immediately when the form first opens.

A field displays an error only after relevant user interaction.

This prevents an empty form from showing multiple validation errors before the user starts typing.

Correcting a value clears its corresponding error without requiring a page reload or new submission.

### Password confirmation revalidation

When the registration password changes, the controller also checks confirmation if confirmation already contains a value.

A mismatch immediately displays an error and disables the Create Account button.

This prevents a previously matching confirmation from remaining incorrectly marked as valid.

### Event listener cleanup

Validation event listeners are managed using an `AbortController`.

When the dialog is destroyed or rebound, its listeners are removed.

This prevents duplicate validation handlers and unintended event behavior.

## 6. Submission handling

The authentication dialog prevents default browser form navigation.

Before accepting a submission, it verifies that:

1. The dialog is open.
2. The dialog is not in its closing animation.
3. The submitted form belongs to the active authentication mode.
4. Every required field passes validation.

If submission is invalid, the corresponding errors are shown and the first invalid field receives focus.

This final check is independent of the disabled submit button and also handles values changed programmatically without normal input events.

During Feature 2, a valid submission displayed the existing placeholder:

`Account sign-in will be available in a later update.`

This was intentional.

Feature 2 did not create Firebase users, authenticate accounts, or establish application sessions.

## 7. Authentication mode changes and SPA routing

Story 4 requires clearing form values when switching between Login and Registration.

The implementation resets both forms only when the authentication mode actually changes.

A reset clears:

- Input values.
- Touched-field state.
- Validation error messages.
- Invalid-field attributes.
- Submit-button readiness.
- Password visibility state.

Authentication mode changes triggered through tabs, inline links, keyboard controls, direct URLs, or browser Back/Forward navigation share the same reset behavior.

Selecting the already-active mode does not unnecessarily clear input values.

Likewise, unrelated URL parameter updates do not reset the form if its authentication mode remains unchanged.

### Focus and reset ordering

Changing authentication modes can move focus away from an input and trigger a `blur` event.

The implementation performs the form reset after the relevant focus movement.

This prevents a late blur event from immediately restoring an error after the form was cleared.

Closing the dialog also clears validation state while preserving the existing focus-restoration behavior.

Passwords and form values are not stored in the URL, localStorage, or application logs.

## 8. Accessibility

The validation UI retains semantic labels, correct input types, required attributes, and appropriate autocomplete values.

Inputs use `aria-describedby` to reference their hints and error messages.

Error elements use:

- `aria-live="polite"`
- `aria-atomic="true"`

The `aria-invalid` attribute changes according to the displayed validation result.

This helps assistive technologies identify invalid fields.

Errors are explained using text rather than color alone.

Correcting input does not unexpectedly move focus, while invalid submission can focus the first invalid field.

The existing form uses `novalidate` so native browser validation popups do not compete with the custom inline validation interface.

## 9. SCSS implementation and Figma correction

Validation feedback uses the project's existing SCSS tokens for error colors, spacing, and typography.

The invalid input border uses:

`tokens.$color-error`

Additional feedback spacing and typography follow the existing design-token system.

### Focused input appearance

During manual browser review, the focused input styling was compared with the MiniGames Figma design.

The original focused state displayed a prominent yellow outer shadow that did not match the intended design.

The focus styling was corrected in `auth-dialog.scss`.

The old focus-shadow behavior and its unused transition were removed.

The focused input container now uses:

```scss
&:focus-within {
  background-color: tokens.$color-surface;
}
```

The existing input border, border radius, dimensions, spacing, and invalid-state border behavior were preserved.

The correction was committed as:

`e82722b style(auth): align input focus state with Figma`

The layout continues to use the existing responsive dialog behavior, SCSS breakpoints, scrolling, and reduced-motion support.

No layout component was replaced with an image.

## 10. Automated testing

Feature 2 extended the existing Feature 1 test suite.

The implementation added 58 tests:

- 43 validation rule tests.
- 14 authentication dialog DOM tests.
- One additional dialog-routing test, with existing routing assertions also updated.

The tests cover valid and invalid values, input boundaries, real-time error clearing, password confirmation changes, disabled submissions, focus management, form resets, and browser history behavior.

Existing Story 3 dialog-routing tests were updated to reflect the new Story 4 form-reset requirement.

The application controllers themselves are tested rather than replacing their logic with fake implementations.

Network requests are mocked, and unexpected live requests are blocked by the shared testing setup.

### Feature 2 verification results

| Metric                                |                Result |
| ------------------------------------- | --------------------: |
| Test files                            |             18 passed |
| Tests                                 |        **191 passed** |
| Failed tests                          |                     0 |
| Statement coverage                    | **89% (1,393/1,565)** |
| Branch coverage                       |    81.62% (844/1,034) |
| Function coverage                     |      93.15% (286/307) |
| Line coverage                         |  91.97% (1,273/1,384) |
| Application TypeScript files included |                    48 |
| Required aggregate statement coverage |                   80% |

All 48 non-declaration source TypeScript files remained included in coverage measurement.

The existing 80% aggregate statement threshold was retained.

No executable application logic was deliberately excluded to improve coverage.

## 11. Development commands and verification

The following commands were used to verify the implementation:

| Command                      | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `npm ci`                     | Install project dependencies according to the lockfile.            |
| `npm test`                   | Execute the complete Vitest test suite.                            |
| `npm run test:coverage`      | Measure project-wide coverage and enforce the statement threshold. |
| `npm run lint`               | Check code using ESLint.                                           |
| `npm run format:check`       | Check formatting using Prettier.                                   |
| `npm run typecheck:tests`    | Type-check application and test-related TypeScript files.          |
| `npm run typecheck:feedback` | Run the existing focused feedback type check.                      |
| `npm run build`              | Generate and verify the production build.                          |
| `npm run dev`                | Run the application locally for manual browser verification.       |

All automated checks passed.

## 12. Manual browser verification

The feature was manually checked in the local MiniGames application.

Confirmed behavior included:

- Required-field and invalid-format errors appearing during input.
- Validation errors clearing when values were corrected.
- Registration username restrictions.
- Registration password strength requirements.
- Exact password confirmation.
- Immediate mismatch feedback after changing the original password.
- Valid Login and Registration submissions displaying the expected placeholder message.
- Figma focused-input styling correction.

The manual review confirmed the core validation behavior.

Automated DOM tests additionally verified form reset behavior, focus management, URL synchronization, and dialog lifecycle handling.

Native screen-reader announcements, browser password-manager autofill timing, and every responsive layout variation were not independently established by the automated tests.

## 13. Git history and integration

Feature 2 was developed on the dedicated branch:

`feature/auth-validation`

It was based on Feature 1 commit:

`a7e8ec1b1dd72eb7feb8238a937dbcd9ebb2ba22`

The feature was integrated into `story-4` through **Pull Request #17**.

The final feature branch included four commits, including the Figma focused-input styling correction.

The PR was merged using a regular merge commit, preserving the original feature commits.

**Merge commit:** `8a12e0d`

No unrelated application features or prohibited frameworks were introduced.

The final `story-4` → `story-3` Cross-Check PR must remain unmerged.

## 14. Scope boundaries

Feature 2 completed frontend validation behavior only.

The following functionality was intentionally outside its scope:

- Firebase SDK initialization.
- Real Email/Password authentication.
- Google OAuth.
- Five-minute application-session management.
- Authentication request locking.
- User profiles.
- Authenticated favorites.
- Comment submission and comment likes.
