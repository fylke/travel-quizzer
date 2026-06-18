"""Admin helpers for destination validation and normalization."""


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
    elif len(name.strip()) > 128:
        errors.append("name: must be between 1 and 128 characters")

    # --- hints validation ---
    hints = data.get("hints")
    if hints is None:
        errors.append("hints: field is required")
    elif not isinstance(hints, list):
        errors.append("hints: must be a list")
    elif len(hints) != 5:
        errors.append("hints: must contain exactly 5 items")
    else:
        for i, hint in enumerate(hints):
            if not isinstance(hint, str):
                errors.append(f"hints[{i}]: must be a string")
            elif len(hint.strip()) == 0:
                errors.append(f"hints[{i}]: must not be blank")
            elif len(hint.strip()) > 256:
                errors.append(f"hints[{i}]: must be between 1 and 256 characters")

    # --- correct_answers validation ---
    correct_answers = data.get("correct_answers")
    if correct_answers is None:
        errors.append("correct_answers: field is required")
    elif not isinstance(correct_answers, list):
        errors.append("correct_answers: must be a list")
    elif len(correct_answers) < 1 or len(correct_answers) > 20:
        errors.append("correct_answers: must contain between 1 and 20 items")
    else:
        for i, answer in enumerate(correct_answers):
            if not isinstance(answer, str):
                errors.append(f"correct_answers[{i}]: must be a string")
            elif len(answer) < 1 or len(answer) > 128:
                errors.append(
                    f"correct_answers[{i}]: must be between 1 and 128 characters"
                )

    return (len(errors) == 0, errors)
