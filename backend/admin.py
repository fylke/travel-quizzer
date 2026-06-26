"""Admin helpers for destination validation and normalization."""

from .validation_rules import (
    ANSWER_MAX_LENGTH,
    ANSWERS_MAX_COUNT,
    ANSWERS_MIN_COUNT,
    DESTINATION_NAME_MAX_LENGTH,
    HINT_COUNT,
    HINT_MAX_LENGTH,
    IMAGES_MAX_COUNT,
    IMAGES_MIN_COUNT,
)


def normalize_answers(answers: list[str]) -> list[str]:
    """Lowercase and strip whitespace from each answer."""
    return [a.lower().strip() for a in answers]


def validate_destination_payload(data: dict) -> tuple[bool, list[str]]:
    """Validate a destination payload for create/update operations.

    Returns (True, []) if valid, or (False, [error messages]) if invalid.
    """
    errors: list[str] = []

    # --- name validation ---
    name = data.get("name")
    if name is None:
        errors.append("name: field is required")
    elif not isinstance(name, str):
        errors.append("name: must be a string")
    elif len(name.strip()) == 0:
        errors.append("name: must not be blank")
    elif len(name.strip()) > DESTINATION_NAME_MAX_LENGTH:
        errors.append(
            f"name: must be between 1 and {DESTINATION_NAME_MAX_LENGTH} characters"
        )

    # --- hints validation ---
    hints = data.get("hints")
    if hints is None:
        errors.append("hints: field is required")
    elif not isinstance(hints, list):
        errors.append("hints: must be a list")
    elif len(hints) != HINT_COUNT:
        errors.append(f"hints: must contain exactly {HINT_COUNT} items")
    else:
        for i, hint in enumerate(hints):
            if not isinstance(hint, str):
                errors.append(f"hints[{i}]: must be a string")
            elif len(hint.strip()) == 0:
                errors.append(f"hints[{i}]: must not be blank")
            elif len(hint.strip()) > HINT_MAX_LENGTH:
                errors.append(
                    f"hints[{i}]: must be between 1 and {HINT_MAX_LENGTH} characters"
                )

    # --- correct_answers validation ---
    correct_answers = data.get("correct_answers")
    if correct_answers is None:
        errors.append("correct_answers: field is required")
    elif not isinstance(correct_answers, list):
        errors.append("correct_answers: must be a list")
    elif (
        len(correct_answers) < ANSWERS_MIN_COUNT
        or len(correct_answers) > ANSWERS_MAX_COUNT
    ):
        errors.append(
            f"correct_answers: must contain between {ANSWERS_MIN_COUNT} and {ANSWERS_MAX_COUNT} items"
        )
    else:
        for i, answer in enumerate(correct_answers):
            if not isinstance(answer, str):
                errors.append(f"correct_answers[{i}]: must be a string")
            elif len(answer) < 1 or len(answer) > ANSWER_MAX_LENGTH:
                errors.append(
                    f"correct_answers[{i}]: must be between 1 and {ANSWER_MAX_LENGTH} characters"
                )

    return (len(errors) == 0, errors)
