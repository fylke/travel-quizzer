# Requirements Document

## Introduction

This feature adds visual feedback animations to the `#answerInput` element in the travel quiz when a user submits an incorrect guess or an empty answer. Instead of relying on JavaScript `alert()` dialogs, the system applies a horizontal shake animation and a pulsating red glow outline to the input field. Both animations are brief, non-disruptive, and respect user motion preferences for accessibility.

## Glossary

- **Answer_Input**: The `#answerInput` text input element in the quiz screen where users type their destination guess.
- **Animation_Controller**: The JavaScript module responsible for applying and removing CSS animation classes on the Answer_Input.
- **Shake_Animation**: A CSS keyframe animation that rapidly translates the Answer_Input horizontally left and right to simulate a shaking motion.
- **Red_Glow_Animation**: A CSS keyframe animation that pulses the box-shadow of the Answer_Input with a red-colored glow, fading in and out.
- **Wrong_Guess_Event**: The event that occurs when a user submits an incorrect answer and still has remaining guesses.
- **Empty_Submission_Event**: The event that occurs when a user submits the answer form with an empty or whitespace-only input value.
- **Reduced_Motion_Preference**: The user's operating system or browser setting indicated by the `prefers-reduced-motion: reduce` media query.

## Requirements

### Requirement 1: Shake Animation on Wrong Guess

**User Story:** As a quiz player, I want the answer input to shake horizontally when I guess wrong, so that I receive immediate visual feedback that my answer was incorrect.

#### Acceptance Criteria

1. WHEN a Wrong_Guess_Event occurs and the player has at least 1 remaining guess, THE Animation_Controller SHALL apply the Shake_Animation to the Answer_Input.
2. THE Shake_Animation SHALL translate the Answer_Input horizontally between -10 pixels and +10 pixels from its resting position, completing at least 2 and no more than 4 full oscillation cycles.
3. THE Shake_Animation SHALL have a total duration between 500 and 800 milliseconds.
4. WHEN the Shake_Animation completes, THE Animation_Controller SHALL remove the animation class from the Answer_Input so the element returns to translateX(0) and the player can immediately type a new answer.
5. IF the user's system indicates prefers-reduced-motion, THEN THE Animation_Controller SHALL skip the Shake_Animation and not apply any horizontal translation to the Answer_Input.

### Requirement 2: Pulsating Red Glow on Wrong Guess

**User Story:** As a quiz player, I want the answer input border to glow red with a pulsating effect when I guess wrong, so that the incorrect feedback is visually prominent.

#### Acceptance Criteria

1. WHEN a Wrong_Guess_Event occurs, THE Animation_Controller SHALL apply the Red_Glow_Animation to the Answer_Input simultaneously with the Shake_Animation.
2. THE Red_Glow_Animation SHALL animate the box-shadow property of the Answer_Input using a red color (hue between 0° and 10°) that completes at least 1 and no more than 2 pulse cycles (fade-in then fade-out constitutes one cycle).
3. THE Red_Glow_Animation SHALL have the same total duration as the Shake_Animation (between 500 and 800 milliseconds).
4. WHEN the Red_Glow_Animation completes, THE Animation_Controller SHALL remove the animation class from the Answer_Input so the box-shadow returns to none (its default state with no glow visible).
5. WHEN a new Wrong_Guess_Event occurs while the Red_Glow_Animation is still active, THE Animation_Controller SHALL restart the Red_Glow_Animation from the beginning.

### Requirement 3: Visual Feedback on Empty Submission

**User Story:** As a quiz player, I want to see the same shake and glow feedback when I try to submit an empty answer, so that I understand I need to type something without being interrupted by a browser alert dialog.

#### Acceptance Criteria

1. WHEN an Empty_Submission_Event occurs, THE Animation_Controller SHALL apply both the Shake_Animation and the Red_Glow_Animation to the Answer_Input simultaneously, where each animation completes within 500 to 800 milliseconds.
2. WHEN an Empty_Submission_Event occurs, THE Animation_Controller SHALL NOT display a JavaScript alert dialog.
3. WHEN an Empty_Submission_Event occurs, THE Animation_Controller SHALL set focus on the Answer_Input within 100 milliseconds of the animations starting, and the Answer_Input SHALL remain editable throughout the animation.
4. THE Animation_Controller SHALL treat an Answer_Input value that is empty or contains only whitespace characters as an Empty_Submission_Event when the user activates the submit action.

### Requirement 4: Animation Auto-Removal

**User Story:** As a quiz player, I want the animations to automatically stop and the input to return to normal, so that I can continue guessing without visual artifacts remaining.

#### Acceptance Criteria

1. WHEN the animation duration elapses on the Answer_Input, THE Animation_Controller SHALL remove all animation-related CSS classes from the Answer_Input so that no visual animation styling remains and the input returns to its default appearance.
2. WHILE the Answer_Input has an active animation (animation-related CSS classes are present and the duration has not yet elapsed), WHEN a new Wrong_Guess_Event or Empty_Submission_Event occurs, THE Animation_Controller SHALL remove and then re-apply the animation classes within a single animation frame so the animation replays from the beginning.
3. WHEN the Animation_Controller removes animation-related CSS classes from the Answer_Input, THE Animation_Controller SHALL preserve the current text content of the Answer_Input and keep the input element enabled and focusable.

### Requirement 5: Accessibility — Reduced Motion

**User Story:** As a user who is sensitive to motion, I want the animations to be suppressed when I have enabled reduced motion in my system preferences, so that the interface does not cause discomfort.

#### Acceptance Criteria

1. WHILE the Reduced_Motion_Preference is active, THE Shake_Animation SHALL NOT play.
2. WHILE the Reduced_Motion_Preference is active, THE Red_Glow_Animation SHALL NOT play.
3. WHILE the Reduced_Motion_Preference is active, WHEN a Wrong_Guess_Event or Empty_Submission_Event occurs, THE Animation_Controller SHALL apply a static red border color change on the Answer_Input that remains visible for a duration between 500 milliseconds and 2000 milliseconds, without any movement, transform, or opacity transition.

### Requirement 6: Non-Interference with Existing Focus Styles

**User Story:** As a quiz player, I want the wrong-guess animations to work without breaking the existing purple focus border on the input, so that the input field still looks correct when I click into it after the animation ends.

#### Acceptance Criteria

1. WHEN the Answer_Input has focus and a Wrong_Guess_Event occurs, THE Animation_Controller SHALL override the Answer_Input border style with the Red_Glow_Animation for the duration of that animation (no longer than 800ms).
2. WHEN the Red_Glow_Animation completes and the Answer_Input still has focus, THE Answer_Input SHALL display the existing focus border style (border-color: #667eea) within 50ms of animation completion.
3. WHEN the Red_Glow_Animation completes and the Answer_Input does not have focus, THE Answer_Input SHALL display the default unfocused border style (border-color: #ddd).
4. WHEN the Shake_Animation or Red_Glow_Animation completes, THE Animation_Controller SHALL remove all animation-related inline styles (border-color, transform, box-shadow) from the Answer_Input, leaving zero residual inline style attributes from the animation.
