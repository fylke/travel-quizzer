# Implementation Plan: Wrong Guess Animations

## Overview

Replace JavaScript `alert()` dialogs for wrong-guess and empty-submission feedback with CSS-driven animations (shake + red glow) on the `#answerInput` element. The implementation adds two `@keyframes` declarations, three CSS utility classes, a `prefers-reduced-motion` media query override, a JavaScript controller function `animateWrongGuess()`, and modifications to the existing `submitAnswer()` function.

## Tasks

- [x] 1. Add CSS keyframes and animation classes
  - [x] 1.1 Add `@keyframes shake`, `@keyframes redGlow`, `.wrong-guess-shake`, `.wrong-guess-glow`, `.wrong-guess-static` classes, and `@media (prefers-reduced-motion: reduce)` override to `frontend/style.css`
    - Define `@keyframes shake` with horizontal translation between -10px and +10px over 3 oscillation cycles
    - Define `@keyframes redGlow` with red box-shadow pulse (1.5 cycles fade in/out)
    - `.wrong-guess-shake` applies the shake animation (600ms)
    - `.wrong-guess-glow` applies the red glow animation (600ms)
    - `.wrong-guess-static` applies a static red border (no motion, no transition)
    - `@media (prefers-reduced-motion: reduce)` disables `.wrong-guess-shake` and `.wrong-guess-glow` animations entirely (animation: none)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3_

- [x] 2. Implement the `animateWrongGuess` controller function
  - [x] 2.1 Add the `animateWrongGuess(inputElement)` function to `frontend/script.js`
    - Return immediately (no-op) if `inputElement` is falsy
    - Check `window.matchMedia('(prefers-reduced-motion: reduce)')` — if matched, apply `.wrong-guess-static` class and remove it via `setTimeout` after 1000ms; do not apply shake/glow
    - If no reduced motion preference: remove existing animation classes, force reflow via `void element.offsetWidth`, then add `.wrong-guess-shake` and `.wrong-guess-glow` classes
    - Listen for `animationend` event (once) to remove both animation classes
    - Add a defensive `setTimeout` at 1000ms as fallback cleanup in case `animationend` never fires
    - Ensure no residual inline styles (`transform`, `box-shadow`, `border-color`) remain after cleanup
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Modify `submitAnswer()` in `frontend/script.js` to call `animateWrongGuess` instead of `alert()`
    - Replace the empty-input check `alert('Please enter an answer')` with a call to `animateWrongGuess(answerInput)` followed by `answerInput.focus()` and early return
    - Treat whitespace-only input identically to empty input (trigger animation, not API call)
    - In the wrong-but-has-remaining-guesses branch, add a call to `animateWrongGuess(answerInput)` before updating hints
    - Ensure `submitting` flag is correctly managed so animation does not block future submissions
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.3, 3.4_

- [x] 3. Checkpoint — Verify manual integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write Jasmine unit tests
  - [x] 4.1 Create `test_frontend/spec/wrongGuessAnimationSpec.js` with Jasmine unit tests
    - Test that `animateWrongGuess` adds `.wrong-guess-shake` and `.wrong-guess-glow` classes
    - Test that firing `animationend` removes both animation classes
    - Test that with `prefers-reduced-motion` mocked, only `.wrong-guess-static` is applied
    - Test that re-triggering mid-animation restarts (classes re-applied)
    - Test that empty/whitespace submission calls `animateWrongGuess` instead of `alert()`
    - Test that input remains enabled and focusable during animation
    - Test that `alert()` is never called in wrong-guess or empty-submission paths
    - Test that after animation ends with focus, existing focus style is preserved
    - _Requirements: 1.1–1.5, 2.1–2.5, 3.1–3.4, 4.1–4.3, 5.1–5.3, 6.1–6.4_

  - [x] 4.2 Write property test for whitespace-only input triggering animation
    - **Property 1: Whitespace-only input triggers animation, not API call**
    - **Validates: Requirements 3.4**
    - Use fast-check with jsdom to generate arbitrary whitespace strings and verify animation is triggered without fetch

  - [x] 4.3 Write property test for re-trigger always restarts animation
    - **Property 2: Re-trigger always restarts animation**
    - **Validates: Requirements 4.2, 2.5**
    - Use fast-check with `fc.integer({min: 1, max: 50})` to call `animateWrongGuess` N times and assert animation classes are present after the last call

  - [x] 4.4 Write property test for animation cleanup preserving input state
    - **Property 3: Animation cleanup preserves input state and leaves no residual styling**
    - **Validates: Requirements 4.3, 6.4**
    - Use fast-check with `fc.string()` to set arbitrary input values, trigger and complete animation, then verify value is preserved and no residual inline styles exist

- [x] 5. Checkpoint — Ensure all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Write Playwright E2E tests
  - [x] 6.1 Add E2E tests in `test_e2e/test_wrong_guess_animation.py`
    - Test: submit wrong answer → input has `.wrong-guess-shake` and `.wrong-guess-glow` classes
    - Test: submit empty input → animation plays, no alert dialog appears
    - Test: animation ends → classes removed, input usable
    - Test: with `prefers-reduced-motion` emulated → static red border only, no motion classes
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 5.1, 5.2, 5.3_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation is entirely client-side (CSS + vanilla JS) — no backend changes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4.1", "6.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] }
  ]
}
```
