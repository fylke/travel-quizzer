"""Quiz blueprint — quiz flow, hints, and answer checking."""

import random

from flask import Blueprint, jsonify, request

from .auth import get_current_user, login_required
from .models import Destination, QuizResult, db

quiz_bp = Blueprint("quiz", __name__)

STARTING_HINT_DIFFICULTY = 5
MAX_GUESSES = 3


def _start_quiz(user, destination):
    """Set up server-side state for a new quiz and return the response dict.

    Ends any previously active quiz for this user, creates or resets
    the QuizResult row, and commits the transaction.
    """
    hint_difficulty = STARTING_HINT_DIFFICULTY
    hint_text = getattr(destination, f"hint{hint_difficulty}", "")

    # End any previously active quiz
    QuizResult.query.filter_by(user_id=user.id, ongoing=True).update({"ongoing": False})

    quiz_result = QuizResult.query.filter_by(
        user_id=user.id, destination_id=destination.id
    ).first()
    if quiz_result is None:
        quiz_result = QuizResult(user_id=user.id, destination_id=destination.id)
    quiz_result.hint_difficulty = hint_difficulty
    quiz_result.remaining_guesses = MAX_GUESSES
    quiz_result.ongoing = True
    db.session.add(quiz_result)
    db.session.commit()

    return {
        "id": destination.id,
        "hint": hint_text,
        "hintDifficulty": hint_difficulty,
        "remainingGuesses": MAX_GUESSES,
        "images": [
            f"/media/countries/{destination.id}/{hint_difficulty}a.jpg",
            f"/media/countries/{destination.id}/{hint_difficulty}b.jpg",
        ],
    }


@quiz_bp.route("/api/quiz", methods=["GET"])
@login_required
def get_quiz():
    """Return a random destination along with its first hint and pictures."""
    destinations = Destination.query.all()
    if not destinations:
        return jsonify({"error": "No quiz data available"}), 404

    random_destination = random.choice(destinations)
    user = get_current_user()
    return jsonify(_start_quiz(user, random_destination))


@quiz_bp.route("/api/quiz/<int:destination_id>", methods=["GET"])
@login_required
def get_specific_quiz(destination_id):
    """Return a specific destination for a quiz."""
    destination = Destination.query.filter_by(id=destination_id).first()
    if not destination:
        return jsonify({"error": "Destination not found"}), 404

    user = get_current_user()
    return jsonify(_start_quiz(user, destination))


@quiz_bp.route("/api/hint", methods=["GET"])
@login_required
def get_hint():
    """Fetch the next hint for the user's active quiz, decrementing difficulty."""
    user = get_current_user()
    quiz_result = QuizResult.query.filter_by(user_id=user.id, ongoing=True).first()
    if quiz_result is None:
        return jsonify({"error": "No active quiz"}), 404

    # Decrement hint difficulty to reveal an easier hint
    new_difficulty = quiz_result.hint_difficulty - 1
    if new_difficulty < 1:
        return jsonify({"error": "No more hints remaining"}), 404

    question = Destination.query.filter_by(id=quiz_result.destination_id).first()
    if not question:
        return jsonify({"error": "Question not found"}), 404

    quiz_result.hint_difficulty = new_difficulty
    db.session.commit()

    hint_text = getattr(question, f"hint{new_difficulty}", "")
    return jsonify(
        {
            "hint": hint_text,
            "hintDifficulty": new_difficulty,
            "remainingGuesses": quiz_result.remaining_guesses,
        }
    )


@quiz_bp.route("/api/check-answer", methods=["POST"])
@login_required
def check_answer():
    """Check if the answer is correct, using server-side state for scoring."""
    data = request.json or {}
    user_answer = (data.get("answer") or "").lower().strip()

    user = get_current_user()
    quiz_result = QuizResult.query.filter_by(user_id=user.id, ongoing=True).first()
    if quiz_result is None:
        return jsonify({"error": "No active quiz"}), 404

    question = Destination.query.filter_by(id=quiz_result.destination_id).first()
    if not question:
        return jsonify({"error": "Question not found"}), 404

    is_correct = user_answer in question.correct_answers

    if is_correct:
        points = quiz_result.hint_difficulty * quiz_result.remaining_guesses
        quiz_result.ongoing = False
        db.session.commit()
        return jsonify({"correct": True, "answer": question.name, "points": points})

    # Wrong answer — decrement remaining guesses
    quiz_result.remaining_guesses -= 1
    if quiz_result.remaining_guesses <= 0:
        quiz_result.ongoing = False
        db.session.commit()
        return jsonify({"correct": False, "answer": question.name, "points": 0})

    # Still has guesses left — also reveal next hint
    new_difficulty = quiz_result.hint_difficulty - 1
    if new_difficulty >= 1:
        quiz_result.hint_difficulty = new_difficulty

    db.session.commit()

    hint_text = getattr(question, f"hint{quiz_result.hint_difficulty}", "")
    return jsonify(
        {
            "correct": False,
            "remainingGuesses": quiz_result.remaining_guesses,
            "hintDifficulty": quiz_result.hint_difficulty,
            "hint": hint_text,
        }
    )
