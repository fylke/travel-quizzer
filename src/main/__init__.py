from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
import os
import random
from werkzeug.security import check_password_hash, generate_password_hash
from .models import db, Destination, QuizResult, User

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_ROOT = os.path.dirname(BASE_DIR)
PROJECT_ROOT = os.path.dirname(SRC_ROOT)
STATIC_DIR = os.path.join(SRC_ROOT, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY', 'change-me-in-production')

# Configure database (allow override via env var)
default_db_path = os.path.join(PROJECT_ROOT, "data", "quiz_data.db")
db_url = os.environ.get('QUIZ_DATABASE_URL') or os.environ.get('DATABASE_URL') or f"sqlite:///{default_db_path}"

if db_url.startswith("sqlite:///") and db_url != "sqlite:///:memory:":
    db_path = db_url.split("sqlite:///")[1]
    db_path = os.path.abspath(db_path)
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    db_url = f"sqlite:///{db_path}"

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()


def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.get(user_id)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if get_current_user() is None:
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapper


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    return jsonify({"id": user.id, "name": user.name, "email": user.email})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    session['user_id'] = user.id
    return jsonify({"id": user.id, "name": user.name, "email": user.email})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route('/api/me', methods=['GET'])
def me():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"id": user.id, "name": user.name, "email": user.email})


@app.route('/api/status', methods=['GET'])
@login_required
def get_status():
    """Return quiz stats for the current user."""
    user = get_current_user()
    results = QuizResult.query.filter_by(user_id=user.id).all()
    completed = [r for r in results if not r.ongoing]
    total_points = sum(r.hint_difficulty * r.remaining_guesses for r in completed if r.remaining_guesses > 0)
    return jsonify({
        "quizzesCompleted": len(completed),
        "totalPoints": total_points,
        "quizzesOngoing": len([r for r in results if r.ongoing]),
    })


@app.route('/api/quiz', methods=['GET'])
@login_required
def get_quiz():
    """Return a random destination along with its first hint and pictures"""
    destinations = Destination.query.all()
    if not destinations:
        return jsonify({"error": "No quiz data available"}), 404

    random_destination = random.choice(destinations)
    hint_difficulty = 5  # Start with the hardest hint
    hint_text = getattr(random_destination, f"hint{hint_difficulty}", '')

    return jsonify({
        "id": random_destination.id,
        "hint": hint_text,
        "images": random_destination.images
    })


@app.route('/api/quiz/<int:destination_id>', methods=['GET'])
@login_required
def get_specific_quiz(destination_id):
    """Return a specific destination for a quiz."""
    destination = Destination.query.filter_by(id=destination_id).first()
    if not destination:
        return jsonify({"error": "Destination not found"}), 404

    hint_difficulty = 5
    hint_text = getattr(destination, f"hint{hint_difficulty}", '')

    return jsonify({
        "id": destination.id,
        "hint": hint_text,
        "images": destination.images
    })


@app.route('/api/hint', methods=['GET'])
@login_required
def get_hint():
    """Get a specific hint for a destination by difficulty level"""
    destination_id = request.args.get('questionId', type=int)
    difficulty = request.args.get('difficulty', type=int)

    if destination_id is None or difficulty is None:
        return jsonify({"error": "Missing questionId or difficulty parameter"}), 400

    if not (1 <= difficulty <= 5):
        return jsonify({"error": "Difficulty must be between 1 and 5"}), 400

    question = Destination.query.filter_by(id=destination_id).first()
    if not question:
        return jsonify({"error": "Question not found"}), 404

    hint_text = getattr(question, f"hint{difficulty}", '')
    return jsonify({
        "hint": hint_text,
        "questionId": destination_id,
        "difficulty": difficulty
    })


@app.route('/api/check-answer', methods=['POST'])
@login_required
def check_answer():
    """Check if the answer is correct and return points"""
    data = request.json or {}
    destination_id = data.get('questionId')
    user_answer = (data.get('answer') or '').lower().strip()
    hint_difficulty = data.get('hintDifficulty', 0)
    remaining_guesses = data.get('remainingGuesses', 1)

    question = Destination.query.filter_by(id=destination_id).first()
    if not question:
        return jsonify({"error": "Question not found"}), 404

    is_correct = user_answer in question.correct_answers
    points = hint_difficulty * remaining_guesses if is_correct else 0

    user = get_current_user()
    quiz_result = QuizResult.query.filter_by(user_id=user.id, destination_id=destination_id).first()
    if quiz_result is None:
        quiz_result = QuizResult(
            user_id=user.id,
            destination_id=destination_id
        )
    quiz_result.hint_difficulty = hint_difficulty
    quiz_result.remaining_guesses = remaining_guesses
    quiz_result.ongoing = not is_correct and remaining_guesses > 0
    db.session.add(quiz_result)
    db.session.commit()

    return jsonify({
        "correct": is_correct,
        "answer": question.name,
        "points": points
    })


@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == '__main__':
    app.run(debug=False, port=5000, host='0.0.0.0')
