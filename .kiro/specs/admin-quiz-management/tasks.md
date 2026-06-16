# Implementation Plan: Admin Quiz Management

## Overview

This plan implements admin CRUD operations for quiz destinations in the Travel Quizzer application. It adds an `is_admin` field to the User model, creates protected admin API endpoints with validation, and builds a frontend admin screen integrated into the existing SPA. Tasks are ordered so that each step builds on prior work, starting with the data model change and working up through the API layer, frontend, and testing.

## Tasks

- [x] 1. Add admin role to User model and update auth responses
  - [x] 1.1 Add `is_admin` column to User model
    - Add `is_admin = db.Column(db.Boolean, nullable=False, default=False)` to the `User` class in `backend/models.py`
    - The column defaults to `False` so existing users are unaffected
    - _Requirements: 1.1_

  - [x] 1.2 Update auth endpoints to include `isAdmin` in responses
    - Modify `/api/login`, `/api/register`, and `/api/me` in `backend/__init__.py` to include `"isAdmin": user.is_admin` in their JSON responses
    - _Requirements: 1.5_

  - [x] 1.3 Create `admin_required` decorator
    - Add a new decorator in `backend/__init__.py` that wraps `login_required` and checks `get_current_user().is_admin`
    - Return 403 with `{"error": "Admin access required"}` if user is not admin
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. Implement validation and normalization functions
  - [x] 2.1 Create `backend/admin.py` with `validate_destination_payload` function
    - Pure function taking a dict and returning `(is_valid: bool, errors: list[str])`
    - Validate: name 1–128 non-blank chars, exactly 5 hints each 1–256 non-blank chars, 2–10 image URLs each starting with `http://` or `https://`, 1–20 correct answers each 1–128 chars
    - _Requirements: 4.2, 4.3, 5.4, 8.1, 8.2, 8.3_

  - [x] 2.2 Create `normalize_answers` function in `backend/admin.py`
    - Pure function that lowercases and strips whitespace from each answer string
    - _Requirements: 4.5, 5.6_

  - [ ]* 2.3 Write property test for destination validation (Property 4)
    - **Property 4: Destination validation accepts valid and rejects invalid payloads**
    - Use Hypothesis to generate random valid/invalid payloads and verify the validation function correctly accepts/rejects them
    - Create `test_unit/test_admin_properties.py`
    - **Validates: Requirements 4.2, 4.3, 5.4, 8.1, 8.2, 8.3**

  - [ ]* 2.4 Write property test for answer normalization (Property 5)
    - **Property 5: Answer normalization**
    - Use Hypothesis to generate random strings with mixed whitespace and casing, verify normalization produces lowercase trimmed output
    - Add to `test_unit/test_admin_properties.py`
    - **Validates: Requirements 4.5, 5.6**

- [ ] 3. Implement admin API endpoints
  - [~] 3.1 Implement GET `/api/admin/destinations` endpoint
    - Register a new route in `backend/__init__.py` (or import from `backend/admin.py`)
    - Protected by `admin_required`, returns all destinations ordered by ID ascending with `count` field
    - Response: `{"destinations": [{"id": N, "name": "..."}], "count": N}`
    - _Requirements: 3.1, 3.2_

  - [~] 3.2 Implement GET `/api/admin/destinations/<id>` endpoint
    - Protected by `admin_required`, returns full destination data (name, hints as array, images, correct_answers)
    - Return 404 if destination not found
    - _Requirements: 5.1_

  - [~] 3.3 Implement POST `/api/admin/destinations` endpoint
    - Protected by `admin_required` and `csrf_protected`
    - Validate payload using `validate_destination_payload`, return 400 on failure
    - Check for duplicate name (case-sensitive), return 409 on conflict
    - Store hints as hint1–hint5 columns, answers normalized via `normalize_answers`
    - Return 201 with `{"id": new_id}`
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 7.1_

  - [~] 3.4 Implement PUT `/api/admin/destinations/<id>` endpoint
    - Protected by `admin_required` and `csrf_protected`
    - Validate payload, return 400 on failure; return 404 if destination not found
    - Replace all fields with submitted values, normalize answers
    - Return 200 with updated destination data
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 7.1_

  - [~] 3.5 Implement DELETE `/api/admin/destinations/<id>` endpoint
    - Protected by `admin_required` and `csrf_protected`
    - Return 404 if destination not found
    - Delete destination and cascade to associated quiz_result rows (handled by SQLAlchemy cascade)
    - Return 200 with `{"message": "Destination deleted"}`
    - _Requirements: 6.2, 6.3, 7.1_

- [~] 4. Checkpoint - Verify backend functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build admin frontend screen
  - [~] 5.1 Add admin screen HTML to `frontend/index.html`
    - Add `<div id="adminScreen" class="screen hidden">` with header, destination count, destinations list container, "Add New Destination" button, empty-state message, and error display area
    - Add destination form section with name input, five hint textareas, dynamic image URL list, dynamic correct answers list, Save and Cancel buttons
    - Add confirmation dialog markup for delete
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [~] 5.2 Add admin navigation link to status screen
    - Add an "Admin" link/button inside `statusScreen` that is conditionally shown when `quizState.user.isAdmin` is true
    - _Requirements: 2.1, 2.2, 2.5_

  - [~] 5.3 Implement admin JavaScript logic in `frontend/script.js`
    - Add functions: `showAdminScreen()`, `loadDestinations()`, `showDestinationForm(id?)`, `saveDestination()`, `deleteDestination(id)`, `hideAdminScreen()`
    - `loadDestinations()`: fetches GET `/api/admin/destinations`, renders list, shows empty state if count is 0, handles errors
    - `showDestinationForm(id)`: if id provided, fetches GET `/api/admin/destinations/<id>` to populate form; otherwise shows blank form
    - `saveDestination()`: collects form data, performs client-side validation, sends POST or PUT with `X-CSRF-Token` header, shows success/error, refreshes list
    - `deleteDestination(id)`: shows confirmation dialog with destination name, on confirm sends DELETE with `X-CSRF-Token` header, refreshes list
    - Update `showStatusScreen()` to show/hide admin link based on `quizState.user.isAdmin`
    - Update `loadUser()` to capture `isAdmin` from `/api/me` response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 3.4, 4.1, 4.4, 5.1, 5.2, 5.5, 6.1, 6.4, 6.5, 6.6, 7.2_

  - [~] 5.4 Add admin screen styles to `frontend/style.css`
    - Style the admin screen layout, destinations table/list, form elements, error/success messages, and confirmation dialog
    - Follow existing design patterns in `style.css`
    - _Requirements: 2.3_

- [~] 6. Checkpoint - Verify full stack integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Write unit tests for admin API
  - [ ]* 7.1 Write unit tests for validation and normalization
    - Create `test_unit/test_admin_validation.py`
    - Test valid payloads, boundary values (name exactly 128 chars, hints exactly 256 chars), invalid payloads (empty name, whitespace-only hints, too few/many images, invalid URLs, too many answers)
    - Test `normalize_answers` with mixed case, spaces, already-normalized values
    - _Requirements: 4.2, 4.3, 4.5, 8.1, 8.2, 8.3_

  - [ ]* 7.2 Write unit tests for admin API endpoints
    - Create `test_unit/test_admin_api.py`
    - Test auth: unauthenticated returns 401, non-admin returns 403, admin succeeds
    - Test CRUD operations: create returns 201, list returns ordered destinations, get returns full data, update replaces fields, delete removes destination
    - Test error cases: duplicate name returns 409, not found returns 404, missing CSRF returns 403
    - Test cascade: deleting a destination with quiz results removes both
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 4.1, 4.6, 5.2, 5.3, 6.2, 6.3, 7.1_

  - [ ]* 7.3 Write property test for update round-trip (Property 7)
    - **Property 7: Update round-trip**
    - Use Hypothesis to generate valid destination data, create it via API, update with new valid data, verify GET returns the updated values with answers normalized
    - Add to `test_unit/test_admin_properties.py`
    - **Validates: Requirements 5.2**

- [~] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `cascade='all, delete-orphan'` on `Destination.results` handles quiz result cleanup on deletion
- Hypothesis is used for property-based tests (already available in the Python ecosystem)
- Add `hypothesis` to the test dependency group in `pyproject.toml` when implementing property tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.4"] },
    { "id": 6, "tasks": ["5.3"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3"] }
  ]
}
```
