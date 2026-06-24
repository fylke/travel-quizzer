# Implementation Plan: Forgot Password

## Overview

Implement the forgot-password flow for Travel Quizzer. The feature adds a `PasswordResetToken` database model, two new backend modules (`reset_tokens.py` and `email_service.py`), four new API routes in `backend/__init__.py`, a dedicated `frontend/reset_password.html` page, modal UI additions to `index.html` and `script.js`, and a full test suite (unit, property-based, frontend Jasmine, and end-to-end).

## Tasks

- [x] 1. Add `PasswordResetToken` model and extend `User` model
  - [x] 1.1 Add `PasswordResetToken` SQLAlchemy model to `backend/models.py`
    - Create the `password_reset_token` table with columns: `id`, `user_id` (FK → user.id, indexed), `token_hash` (String(64), unique, indexed), `created_at`, `expires_at`, `consumed` (Boolean, default False)
    - Add `user` relationship with `cascade='all, delete-orphan'` backref
    - Add `password_changed_at` (DateTime, nullable, default None) column to the existing `User` model
    - _Requirements: 1.2, 2.5, 3.2_

  - [x] 1.2 Write unit tests for model schema in `test_backend/test_forgot_password.py`
    - Verify `PasswordResetToken` table columns, uniqueness constraint on `token_hash`, and FK relationship
    - Verify `password_changed_at` column exists on `User`
    - _Requirements: 1.2, 2.5_

- [x] 2. Implement `Reset_Token_Service` in `backend/reset_tokens.py`
  - [x] 2.1 Implement `generate_token(user)` function
    - Use `secrets.token_urlsafe(32)` to produce the raw token (≥256 bits entropy)
    - Hash with `hashlib.sha256(raw.encode()).hexdigest()` — store hash only, never plaintext
    - Delete all existing `PasswordResetToken` records for `user.id` where `consumed=False` before inserting the new one
    - Insert `PasswordResetToken(user_id, token_hash, created_at=utcnow(), expires_at=utcnow()+15min, consumed=False)`
    - Return the raw token string
    - _Requirements: 1.1, 1.2, 1.3, 2.5, 2.6, 2.7_

  - [x] 2.2 Write property test for token uniqueness and entropy (Property 1)
    - **Property 1: Token uniqueness and entropy**
    - **Validates: Requirements 1.1, 2.6**
    - File: `test_backend/test_pbt_forgot_password.py`
    - Generate 10 tokens per run; assert all are distinct, URL-safe, and `len(token) >= 64`
    - Annotate: `# Feature: forgot-password, Property 1: Token uniqueness and entropy`

  - [x] 2.3 Write property test for token invalidation on new generation (Property 2)
    - **Property 2: New token invalidates all prior unused tokens**
    - **Validates: Requirements 1.3, 2.7**
    - For a generated user, generate k ∈ [2, 5] tokens sequentially; assert only the last passes `validate_token()`
    - Annotate: `# Feature: forgot-password, Property 2: New token invalidates all prior unused tokens`

  - [x] 2.4 Implement `validate_token(raw_token)` function
    - Hash the raw token; query `PasswordResetToken` by `token_hash` and `consumed=False`
    - Return `None` if no match, or if `record.expires_at < datetime.utcnow()`
    - Return the `PasswordResetToken` record if valid
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.5 Write property test for consumed token rejection (Property 3)
    - **Property 3: Consumed token is rejected on reuse**
    - **Validates: Requirements 2.2, 2.3, 3.7**
    - Generate a token, consume it via `consume_token()`, call `validate_token()` again; assert `None` is returned
    - Annotate: `# Feature: forgot-password, Property 3: Consumed token is rejected on reuse`

  - [x] 2.6 Write property test for hash storage (Property 4)
    - **Property 4: Token hash stored, not plaintext**
    - **Validates: Requirements 2.5**
    - Generate a token; query `PasswordResetToken` by `user_id`; assert `token_hash == sha256(raw).hexdigest()` and `token_hash != raw`
    - Annotate: `# Feature: forgot-password, Property 4: Token hash stored, not plaintext`

  - [x] 2.7 Implement `consume_token(token_record, new_password)` function
    - Call `werkzeug.security.generate_password_hash(new_password)` and assign to `user.password_hash`
    - Set `user.password_changed_at = datetime.utcnow()`
    - Set `token_record.consumed = True`
    - Call `db.session.commit()`
    - _Requirements: 3.1, 3.2, 3.7_

  - [x] 2.8 Write property test for password reset hash correctness (Property 6)
    - **Property 6: Password reset hash correctness**
    - **Validates: Requirements 3.1**
    - For any `st.text(min_size=8, max_size=128)` new password, call `consume_token()`; read back `user.password_hash`; assert `check_password_hash(hash, password) == True`
    - Annotate: `# Feature: forgot-password, Property 6: Password reset hash correctness`

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `Email_Service` in `backend/email_service.py`
  - [x] 4.1 Implement `EmailServiceError` and `send_password_reset_email(to_address, reset_url)`
    - Define `class EmailServiceError(Exception)` with a `reason` string attribute
    - Read SMTP config from env vars at call time: `SMTP_HOST`, `SMTP_PORT` (int, 1–65535), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`; raise `EmailServiceError` with a descriptive reason if any are missing or empty
    - Read `SMTP_USE_TLS` (optional); use `smtplib.SMTP_SSL` when `"true"`, otherwise `smtplib.SMTP` with 10-second timeout
    - Build a `MIMEText` email: subject `"Travel Quizzer — Password Reset Request"`, body containing the reset URL with token as query parameter, expiry notice ("This link expires in 15 minutes."), and an ignore notice
    - Send via `smtp.sendmail(from_addr, to_address, message.as_string())` inside a `try/except smtplib.SMTPException`; on failure raise `EmailServiceError`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Write property test for email body required elements (Property 7)
    - **Property 7: Email body contains required elements**
    - **Validates: Requirements 4.4**
    - For any `st.text()` token and `st.from_regex(r'https?://[a-z0-9.]+')`  base URL, call the email construction helper; assert subject contains "password reset", body contains the token in a URL, body contains "15 minutes"
    - Annotate: `# Feature: forgot-password, Property 7: Email body contains required elements`

  - [x] 4.3 Write unit tests for `Email_Service` in `test_backend/test_forgot_password.py`
    - SMTP success path: mock `smtplib.SMTP`, verify `sendmail` called with correct from/to addresses and that body contains reset URL and expiry text
    - SMTP misconfiguration: missing env var raises `EmailServiceError` with descriptive reason
    - SMTP delivery rejection: `SMTPException` is caught and re-raised as `EmailServiceError`
    - TLS path: when `SMTP_USE_TLS=true`, assert `smtplib.SMTP_SSL` is used
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 5. Add new API routes to `backend/__init__.py`
  - [x] 5.1 Implement `POST /api/forgot-password` route
    - Apply `@limiter.limit("3 per hour", key_func=lambda: (request.json or {}).get("email", ""))` and `@limiter.limit("10 per hour")` decorators
    - Validate email field: return 400 `{"error": "Email is required."}` if empty/missing; return 400 `{"error": "Invalid email format."}` if not matching `_EMAIL_RE`
    - Look up user by email; if found call `generate_token(user)` then `send_password_reset_email(email, reset_url)`; if `EmailServiceError` is raised, log and return 500
    - Always return 200 `{"message": "If that email is registered, a reset link has been sent."}` for valid-format emails (known or unknown user)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.3, 4.6, 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Implement `GET /api/reset-password/validate` and `POST /api/reset-password` routes
    - `GET /api/reset-password/validate?token=<token>`: call `validate_token(token)`; return 200 `{"valid": true}` if valid, else 400 `{"error": "Invalid or expired reset link."}`
    - `POST /api/reset-password`: extract `token` and `password` from JSON body; return 400 if either is missing; validate password length 8–128 (return 400 with message); call `validate_token(token)`, return 400 if invalid; call `consume_token(record, password)`; return 200 `{"message": "Your password has been reset. You may now log in."}`; return 500 on unexpected DB error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.3 Implement `GET /reset-password` route and update `get_current_user()` for session invalidation
    - Add route `GET /reset-password` that serves `frontend/reset_password.html` via `send_from_directory(STATIC_DIR, 'reset_password.html')`
    - Update `get_current_user()` to compare `session.get('logged_in_at', 0)` against `user.password_changed_at.timestamp()` (if set); return `None` if session predates the password change
    - Update `/api/login` and `/api/register` to write `session['logged_in_at'] = datetime.utcnow().timestamp()` at login time
    - _Requirements: 3.2, 7.8_

  - [x] 5.4 Write unit tests for API routes in `test_backend/test_forgot_password.py`
    - Happy path `POST /api/forgot-password`: registered email → token generated, email sent (SMTP mocked), 200 response
    - Unknown email: same 200 response, no token generated, no email sent
    - Invalid email format: 400 response
    - Empty email: 400 response
    - `GET /api/reset-password/validate` with valid token: `{"valid": true}`
    - `GET /api/reset-password/validate` with expired, consumed, unknown token: 400
    - `POST /api/reset-password` happy path: password updated, token consumed, 200 response
    - `POST /api/reset-password` with expired/consumed/unknown token: 400
    - `POST /api/reset-password` with too-short/too-long password: 400
    - Session invalidation: session created before reset is rejected after reset (`get_current_user()` returns None)
    - SMTP failure: 500 response, error logged
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 3.5, 4.3_

  - [x] 5.5 Write property test for invalid email format returning 400 (Property 8)
    - **Property 8: Invalid email format returns 400**
    - **Validates: Requirements 1.6, 1.7**
    - Use `st.one_of(st.just(""), st.text(max_size=50).filter(lambda s: "@" not in s))` to generate invalid emails; POST to `/api/forgot-password`; assert 400 response
    - Annotate: `# Feature: forgot-password, Property 8: Invalid email format returns 400`

  - [x] 5.6 Write property test for password length boundary enforcement (Property 5)
    - **Property 5: Password length boundary enforcement**
    - **Validates: Requirements 3.3, 3.4, 3.6**
    - Use `st.text(min_size=0, max_size=7)` (too short) and `st.text(min_size=129)` (too long) → assert 400 from `POST /api/reset-password`
    - Use `st.text(min_size=8, max_size=128)` with a valid token → assert 200
    - Annotate: `# Feature: forgot-password, Property 5: Password length boundary enforcement`

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass (`uv run unit-test`), ask the user if questions arise.

- [x] 7. Implement `frontend/reset_password.html` (Password Reset Form page)
  - [x] 7.1 Create `frontend/reset_password.html` with reset form UI and inline script
    - HTML structure: new password input (`id="newPassword"`), confirm password input (`id="confirmPassword"`), inline error span (`id="resetFormError"`), submit button, and a password strength indicator reusing the same CSS classes as `index.html` (`passwordStrengthContainer`, `passwordStrengthFill`, `passwordStrengthLabel`)
    - Include `getPasswordStrength()` and `updatePasswordStrength()` inline (or via a shared helper) — update strength indicator on each keystroke in the new password field
    - On `DOMContentLoaded`: extract `token` from `window.location.search`; call `GET /api/reset-password/validate?token=<token>`; show the form if valid, or show an error message with a link to `/` to request a new email if invalid/expired
    - Validate on submit: both fields non-empty, `newPassword.length >= 8`, `newPassword === confirmPassword`; display inline errors without sending the request if validation fails
    - On `POST /api/reset-password` success: show success message and a "Back to login" link that navigates to `/`
    - On server/network error: display error message and allow retry
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 8. Add `Password_Reset_Modal` to `index.html` and `script.js`
  - [x] 8.1 Add modal HTML to `frontend/index.html`
    - Add `<a href="#" id="forgotPasswordLink" onclick="openForgotPasswordModal(); return false;">Forgot password?</a>` link below the login form (inside the `#welcomeScreen`, below `#switchToLogin`)
    - Add `<div id="forgotPasswordModal" ...>` overlay (hidden by default) containing: `<h2>Reset your password</h2>`, email input (`id="resetEmail"`, `maxlength="100"`), inline error span (`id="resetEmailError"`), "Submit" button (`onclick="handleForgotPasswordSubmit()"`), "Cancel" button (`onclick="closeForgotPasswordModal()"`)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.2 Add modal JS functions to `frontend/script.js`
    - `openForgotPasswordModal()`: show modal overlay, set focus on `#resetEmail`, clear prior errors
    - `closeForgotPasswordModal()`: hide modal, return focus to `#forgotPasswordLink`
    - `handleForgotPasswordSubmit()`: validate email client-side (non-empty, valid format using the existing email regex pattern); if invalid, show inline error in `#resetEmailError` and stop; if valid, POST to `/api/forgot-password`, display confirmation message in the modal regardless of server response for valid-format emails; on 500 show an error allowing retry
    - Focus trap: attach `keydown` listener on the modal; Tab/Shift+Tab cycle among `#resetEmail`, Submit button, Cancel button; Escape calls `closeForgotPasswordModal()`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Checkpoint — Smoke check the full flow
  - Ensure all tests pass (`uv run unit-test`), ask the user if questions arise.

- [x] 10. Write frontend Jasmine tests in `test_frontend/spec/forgotPasswordSpec.js`
  - [x] 10.1 Write Jasmine unit tests for modal and reset form JS
    - `getPasswordStrength` reuse: verify same strength levels returned on reset form as on registration form (weak/fair/good/strong thresholds)
    - Inline validation: mismatched passwords produce the correct error message; matching passwords clear the error
    - Empty/whitespace-only password is rejected before submission (form does not call fetch)
    - Client-side email validation in modal: empty email shows error; email without `@` shows error; valid email format proceeds to fetch call (mock fetch)
    - _Requirements: 6.5, 7.2, 7.4_

- [x] 11. Write end-to-end tests in `test_e2e/test_forgot_password.py`
  - [x] 11.1 Write Playwright end-to-end tests for the full forgot-password flow
    - "Forgot password?" link is visible on the login screen
    - Clicking the link opens the modal without navigating away (URL unchanged, modal visible)
    - Submitting an empty email shows inline error, no network request made
    - Submitting a valid email shows the confirmation message inside the modal
    - Escape key closes the modal and returns focus to the "Forgot password?" link
    - Tab key traps focus within the modal (verify Tab from last element wraps to first)
    - Navigating to `/reset-password?token=invalid` shows the "link is no longer valid" message with a link back
    - Navigating to `/reset-password?token=<valid>` shows the new-password form
    - Submitting mismatched passwords on the reset form shows the inline error
    - Successfully resetting password (with a seeded valid token) shows success message and login link
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7, 7.1, 7.2, 7.5, 7.6_

- [x] 12. Document new environment variables
  - [x] 12.1 Update `AGENTS.md`, `README.md`, and `podman-compose.yml` with SMTP environment variables
    - Add the six SMTP env vars to the environment variables table in `AGENTS.md`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`, `SMTP_USE_TLS`
    - Add the same variables with descriptions and example values to the relevant section of `README.md`
    - Add the SMTP env vars (with empty/placeholder values) to the `environment:` block in `podman-compose.yml` for the backend service
    - _Requirements: 4.1, 4.2_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Run `uv run unit-test` and confirm all backend unit and property-based tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use Hypothesis with `@settings(max_examples=100, deadline=5000)` and in-memory SQLite
- All SMTP calls in tests must be mocked (never send real email during testing)
- `get_current_user()` session invalidation check must be added before any reset routes are wired in, to avoid stale-session bugs
- The `reset_password.html` page inlines or duplicates `getPasswordStrength()` — do not introduce a module bundler; follow the project's vanilla JS approach
- End-to-end tests requiring a valid token should seed a token directly into the in-memory test DB via a test fixture, not by triggering actual email delivery

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["2.5", "2.6", "2.7", "4.2", "4.3"] },
    { "id": 4, "tasks": ["2.8", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["7.1", "8.1"] },
    { "id": 8, "tasks": ["8.2"] },
    { "id": 9, "tasks": ["10.1", "11.1"] },
    { "id": 10, "tasks": ["12.1"] }
  ]
}
```
