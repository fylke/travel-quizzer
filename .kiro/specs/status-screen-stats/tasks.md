# Implementation Plan: Status Screen Stats

## Overview

This plan implements richer statistics on the status screen by introducing a pure `compute_stats()` function, a new `/api/stats` endpoint, and an updated frontend status screen with seven stat cards. The approach keeps the computation logic isolated for testability and follows existing project patterns (Flask routes, SQLAlchemy models, Jasmine frontend tests).

## Tasks

- [x] 1. Implement the pure `compute_stats()` function
  - [x] 1.1 Create `backend/stats.py` with the `compute_stats(results)` function
    - Accept a list of dicts with keys `hint_difficulty`, `remaining_guesses`, `destination_id`
    - Return dict with `cumulativeScore`, `quizzesCompleted`, `averageScore`, `bestScore`, `accuracyRate`, `currentStreak`
    - Handle empty list by returning all zeros
    - Sort by descending `destination_id` for streak calculation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 5.3_

  - [x]* 1.2 Write property test: Score computation correctness
    - **Property 1: Score computation correctness**
    - **Validates: Requirements 1.1, 1.4, 5.3**
    - Create `test_backend/test_stats_properties.py`
    - Use Hypothesis `@st.composite` to generate lists of quiz result dicts
    - Verify cumulative score equals sum of (hint_difficulty × remaining_guesses)
    - Verify average score equals round(cumulative / count, 1)

  - [x]* 1.3 Write property test: Best score is maximum individual score
    - **Property 2: Best score is the maximum individual score**
    - **Validates: Requirements 1.5, 5.3**
    - Verify best score equals max(hint_difficulty × remaining_guesses)

  - [x]* 1.4 Write property test: Accuracy rate formula
    - **Property 3: Accuracy rate formula**
    - **Validates: Requirements 1.6, 5.3**
    - Verify accuracy rate equals round((count where remaining_guesses > 0) / total × 100)
    - Verify result is an integer between 0 and 100

  - [x]* 1.5 Write property test: Current streak counts consecutive recent successes
    - **Property 4: Current streak counts consecutive recent successes**
    - **Validates: Requirements 1.7, 5.3**
    - Generate results with unique destination_ids
    - Verify streak equals count of consecutive results with remaining_guesses > 0 from front of desc-sorted list

  - [x]* 1.6 Write property test: Ongoing records excluded from statistics
    - **Property 5: Ongoing records are excluded from statistics**
    - **Validates: Requirements 5.1, 5.2**
    - Generate mixed lists with ongoing=True/False
    - Verify stats computed from full list (filtering ongoing) equal stats computed from only completed subset

- [x] 2. Implement the `/api/stats` endpoint
  - [x] 2.1 Add `GET /api/stats` route in `backend/__init__.py`
    - Protect with `@login_required`
    - Query `QuizResult` records for the authenticated user
    - Separate completed (ongoing=False) and ongoing records
    - Call `compute_stats()` with completed records
    - Add `quizzesOngoing` count to response
    - Return 401 for unauthenticated requests
    - Return 500 with error message on database failure
    - _Requirements: 1.1, 1.2, 1.3, 1.9, 1.10, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x]* 2.2 Write unit tests for `/api/stats` endpoint
    - Create `test_backend/test_stats_api.py`
    - Test unauthenticated request returns 401
    - Test authenticated user with zero completed quizzes returns all zeros
    - Test authenticated user with completed quizzes returns correct stats
    - Test data isolation: user A only sees own stats
    - Test ongoing quizzes excluded from stats but counted in `quizzesOngoing`
    - _Requirements: 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x]* 2.3 Write property test: Data isolation between users
    - **Property 6: Data isolation between users**
    - **Validates: Requirements 4.2**
    - Create two users with distinct quiz results in test setup
    - Verify stats for user A match computing stats from only user A's records

- [x] 3. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update the frontend status screen
  - [x] 4.1 Update `frontend/index.html` status screen section
    - Replace existing three stat cards with seven stat cards
    - Add cards for: Cumulative Score, Quizzes Completed, Average Score, Best Score, Accuracy Rate, Current Streak, Ongoing Quizzes
    - Each card has a label span and a value span with unique ID
    - Value spans initialized to "0"
    - IDs: `statsCumulativeScore`, `statsCompleted`, `statsAverageScore`, `statsBestScore`, `statsAccuracyRate`, `statsCurrentStreak`, `statsOngoing`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.2 Update `showStatusScreen()` in `frontend/script.js`
    - Change fetch from `/api/status` to `/api/stats`
    - Populate all seven stat card values from API response
    - Append "%" to accuracy rate value
    - On fetch failure, retain default "0" values (no error popup)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x]* 4.3 Write frontend tests for status screen stat cards
    - Add tests to `test_frontend/spec/adminSpec.js` or a new spec file
    - Verify stat cards display correct values from mock API response
    - Verify accuracy rate displays with percent symbol
    - Verify fetch failure leaves defaults at "0"
    - _Requirements: 3.5, 3.8, 3.9_

- [ ] 5. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `compute_stats()` function is intentionally pure to enable property-based testing without Flask context or database fixtures
- The project uses Hypothesis (already in dev dependencies) for property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.2"] },
    { "id": 3, "tasks": ["4.3"] }
  ]
}
```
