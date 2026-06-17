"""Pure statistics computation for quiz results.

This module contains no Flask or database dependencies — it operates
solely on plain Python data structures, making it straightforward to
test with property-based and unit approaches.
"""


def compute_stats(results: list[dict]) -> dict:
    """Compute cumulative statistics from a list of completed quiz results.

    Each result dict is expected to have keys:
        - hint_difficulty (int): score multiplier (1–5)
        - remaining_guesses (int): guesses left at completion (0–3)
        - destination_id (int): used for ordering when computing streak

    Returns a dict with:
        - cumulativeScore (int)
        - quizzesCompleted (int)
        - averageScore (float)
        - bestScore (int)
        - accuracyRate (int)
        - currentStreak (int)

    When *results* is empty, all values are 0.
    """
    if not results:
        return {
            "cumulativeScore": 0,
            "quizzesCompleted": 0,
            "averageScore": 0,
            "bestScore": 0,
            "accuracyRate": 0,
            "currentStreak": 0,
        }

    count = len(results)
    scores = [r["hint_difficulty"] * r["remaining_guesses"] for r in results]

    cumulative_score = sum(scores)
    average_score = round(cumulative_score / count, 1)
    best_score = max(scores)

    successful = sum(1 for r in results if r["remaining_guesses"] > 0)
    accuracy_rate = round(successful / count * 100)

    # Current streak: sort by descending destination_id, count consecutive
    # results from the front where remaining_guesses > 0.
    sorted_results = sorted(results, key=lambda r: r["destination_id"], reverse=True)
    current_streak = 0
    for r in sorted_results:
        if r["remaining_guesses"] > 0:
            current_streak += 1
        else:
            break

    return {
        "cumulativeScore": cumulative_score,
        "quizzesCompleted": count,
        "averageScore": average_score,
        "bestScore": best_score,
        "accuracyRate": accuracy_rate,
        "currentStreak": current_streak,
    }
