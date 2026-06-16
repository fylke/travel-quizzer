from functools import wraps
import secrets

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import random
import re
from werkzeug.security import check_password_hash, generate_password_hash
from .models import db, Destination, QuizResult, User

# Basic email format check — intentionally lenient but catches obvious junk
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
STATIC_DIR = os.path.join(PROJECT_ROOT, 'frontend')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')

# Restrict CORS to the app's own origin in production; allow all in dev.
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '*')
CORS(app, origins=_cors_origins.split(','), supports_credentials=True)
_secret_key = os.environ.get('SECRET_KEY')
if not _secret_key:
    import logging as _logging

    _env = os.environ.get('FLASK_ENV', 'development')
    if _env == 'production':
        raise RuntimeError(
            "SECRET_KEY environment variable must be set in production. "
            "Refusing to start with an insecure default."
        )
    _logging.getLogger(__name__).warning(
        "SECRET_KEY is not set — using an insecure default. "
        "Do NOT run like this in production."
    )
    _secret_key = 'change-me-in-production'

app.secret_key = _secret_key

# Secure session cookie configuration
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'

# Rate limiter (uses in-memory storage by default; set RATELIMIT_STORAGE_URI for Redis)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
)


@limiter.request_filter
def _disable_limiter_in_testing():
    """Skip rate limiting when app is in testing mode."""
    return app.testing

# Configure database (allow override via env var)
default_db_path = os.path.join(PROJECT_ROOT, "database", "quiz_data.db")
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


def _generate_csrf_token():
    """Generate a new CSRF token and store it in the session."""
    token = secrets.token_hex(32)
    session['csrf_token'] = token
    return token


def _check_csrf_token():
    """Validate the CSRF token from the X-CSRF-Token header against the session."""
    token = request.headers.get('X-CSRF-Token', '')
    expected = session.get('csrf_token', '')
    if not expected or not secrets.compare_digest(token, expected):
        return False
    return True


def csrf_protected(fn):
    """Decorator that rejects requests with a missing or invalid CSRF token."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _check_csrf_token():
            return jsonify({"error": "Invalid or missing CSRF token"}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if get_current_user() is None:
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """Decorator that requires the user to be authenticated AND an admin."""
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
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

    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

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
    csrf_token = _generate_csrf_token()
    return jsonify({"id": user.id, "name": user.name, "email": user.email, "isAdmin": user.is_admin, "csrfToken": csrf_token})


@app.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
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
    csrf_token = _generate_csrf_token()
    return jsonify({"id": user.id, "name": user.name, "email": user.email, "isAdmin": user.is_admin, "csrfToken": csrf_token})


@app.route('/api/logout', methods=['POST'])
@csrf_protected
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route('/api/me', methods=['GET'])
def me():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401
    csrf_token = _generate_csrf_token()
    return jsonify({"id": user.id, "name": user.name, "email": user.email, "isAdmin": user.is_admin, "csrfToken": csrf_token})


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

    # Create or reset the quiz result to track server-side state
    user = get_current_user()
    # End any previously active quiz
    QuizResult.query.filter_by(user_id=user.id, ongoing=True).update({"ongoing": False})
    quiz_result = QuizResult.query.filter_by(user_id=user.id, destination_id=random_destination.id).first()
    if quiz_result is None:
        quiz_result = QuizResult(user_id=user.id, destination_id=random_destination.id)
    quiz_result.hint_difficulty = hint_difficulty
    quiz_result.remaining_guesses = 3
    quiz_result.ongoing = True
    db.session.add(quiz_result)
    db.session.commit()

    return jsonify({
        "id": random_destination.id,
        "hint": hint_text,
        "hintDifficulty": hint_difficulty,
        "remainingGuesses": 3,
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

    # Create or reset the quiz result to track server-side state
    user = get_current_user()
    # End any previously active quiz
    QuizResult.query.filter_by(user_id=user.id, ongoing=True).update({"ongoing": False})
    quiz_result = QuizResult.query.filter_by(user_id=user.id, destination_id=destination.id).first()
    if quiz_result is None:
        quiz_result = QuizResult(user_id=user.id, destination_id=destination.id)
    quiz_result.hint_difficulty = hint_difficulty
    quiz_result.remaining_guesses = 3
    quiz_result.ongoing = True
    db.session.add(quiz_result)
    db.session.commit()

    return jsonify({
        "id": destination.id,
        "hint": hint_text,
        "hintDifficulty": hint_difficulty,
        "remainingGuesses": 3,
        "images": destination.images
    })


@app.route('/api/hint', methods=['GET'])
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

    hint_text = getattr(question, f"hint{new_difficulty}", '')
    return jsonify({
        "hint": hint_text,
        "hintDifficulty": new_difficulty,
        "remainingGuesses": quiz_result.remaining_guesses
    })


@app.route('/api/check-answer', methods=['POST'])
@login_required
def check_answer():
    """Check if the answer is correct, using server-side state for scoring."""
    data = request.json or {}
    user_answer = (data.get('answer') or '').lower().strip()

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
        return jsonify({
            "correct": True,
            "answer": question.name,
            "points": points
        })

    # Wrong answer — decrement remaining guesses
    quiz_result.remaining_guesses -= 1
    if quiz_result.remaining_guesses <= 0:
        quiz_result.ongoing = False
        db.session.commit()
        return jsonify({
            "correct": False,
            "answer": question.name,
            "points": 0
        })

    # Still has guesses left — also reveal next hint
    new_difficulty = quiz_result.hint_difficulty - 1
    if new_difficulty >= 1:
        quiz_result.hint_difficulty = new_difficulty

    db.session.commit()

    hint_text = getattr(question, f"hint{quiz_result.hint_difficulty}", '')
    return jsonify({
        "correct": False,
        "remainingGuesses": quiz_result.remaining_guesses,
        "hintDifficulty": quiz_result.hint_difficulty,
        "hint": hint_text
    })


@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory(STATIC_DIR, 'index.html')


if __name__ == '__main__':
    app.run(debug=False, port=5000, host='0.0.0.0')
