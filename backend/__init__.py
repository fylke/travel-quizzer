import logging
import os
import re
import sys
from pathlib import Path

import sqlalchemy.exc
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from .auth import (  # noqa: F401 — re-exported for backward compatibility
    admin_required,
    csrf_protected,
    get_current_user,
    login_required,
)
from .models import Destination, QuizResult, User, db
from .quiz_types import get_registry, validate_registry
from .routes_admin import admin_bp
from .routes_auth import auth_bp
from .routes_quiz import quiz_bp
from .stats import compute_stats

# Re-export auth utilities so existing imports like `from backend import admin_required` still work.

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
STATIC_DIR = os.path.join(PROJECT_ROOT, "frontend")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")

# Media directory for quiz images (convention: media/<dest_id>/<hint_level>a.jpg)
MEDIA_DIR = os.environ.get("MEDIA_DIR", os.path.join(PROJECT_ROOT, "media"))

# Restrict CORS to the app's own origin in production; allow all in dev.
_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "*")
CORS(app, origins=_cors_origins.split(","), supports_credentials=True)

_secret_key = os.environ.get("SECRET_KEY")
if not _secret_key:
    _env = os.environ.get("FLASK_ENV", "development")
    if _env == "production":
        raise RuntimeError(
            "SECRET_KEY environment variable must be set in production. "
            "Refusing to start with an insecure default."
        )
    logging.getLogger(__name__).warning(
        "SECRET_KEY is not set — using an insecure default. "
        "Do NOT run like this in production."
    )
    _secret_key = "change-me-in-production"

app.secret_key = _secret_key

# Secure session cookie configuration
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
)

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


# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)


def resolve_database_uri(quiz_db_url=None, database_url=None, default_path=None):
    """Resolve the database URI using the precedence chain.

    Priority:
      1. quiz_db_url (QUIZ_DATABASE_URL) if non-empty
      2. database_url (DATABASE_URL) if non-empty
      3. SQLite default at default_path

    Returns the resolved URI string.
    """
    if default_path is None:
        default_path = os.path.join(PROJECT_ROOT, "database", "quiz_data.db")
    env_url = quiz_db_url or database_url
    return env_url or f"sqlite:///{default_path}"


default_db_path = os.path.join(PROJECT_ROOT, "database", "quiz_data.db")
_env_db_url = os.environ.get("QUIZ_DATABASE_URL") or os.environ.get("DATABASE_URL")
db_url = _env_db_url or f"sqlite:///{default_db_path}"

if db_url.startswith("sqlite:///") and db_url != "sqlite:///:memory:":
    db_path = db_url.split("sqlite:///")[1]
    db_path = os.path.abspath(db_path)
    db_dir = os.path.dirname(db_path)
    if db_dir:
        if not os.path.isdir(db_dir):
            if not _env_db_url:
                # No env var set and database directory missing — container mode
                logger.error(
                    "no database configured: no QUIZ_DATABASE_URL or DATABASE_URL set "
                    "and the database/ directory does not exist"
                )
                sys.exit(1)
            # Env var pointed to a SQLite path whose directory doesn't exist; create it
            os.makedirs(db_dir, exist_ok=True)
        # Directory already exists — local development, nothing to do
    db_url = f"sqlite:///{db_path}"

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

if db_url.startswith("postgresql"):
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"connect_args": {"connect_timeout": 5}}

db.init_app(app)

with app.app_context():
    try:
        db.create_all()
    except sqlalchemy.exc.OperationalError as e:
        logger.error("Database connection failed: %s", e)
        sys.exit(1)

# Validate quiz type registry at startup (fail fast)
_registry_errors = validate_registry(get_registry())
if _registry_errors:
    for _err in _registry_errors:
        logger.error("Quiz type registry error: %s", _err)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Register blueprints
# ---------------------------------------------------------------------------

app.register_blueprint(auth_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(admin_bp)

# Apply rate limits to auth blueprint routes after registration
limiter.limit("5 per minute")(app.view_functions["auth.login"])
limiter.limit("3 per hour", key_func=lambda: (request.json or {}).get("email", ""))(
    app.view_functions["auth.forgot_password"]
)
limiter.limit("10 per hour")(app.view_functions["auth.forgot_password"])

# ---------------------------------------------------------------------------
# Misc routes (health, static files, stats, quiz types, rules)
# ---------------------------------------------------------------------------

_IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


@app.route("/health", methods=["GET"])
def health_check():
    """Public health check endpoint for container orchestration."""
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "healthy"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 503


@app.route("/api/status", methods=["GET"])
@login_required
def get_status():
    """Return quiz stats for the current user."""
    user = get_current_user()
    results = QuizResult.query.filter_by(user_id=user.id).all()
    completed = [r for r in results if not r.ongoing]
    total_points = sum(
        r.hint_difficulty * r.remaining_guesses
        for r in completed
        if r.remaining_guesses > 0
    )
    return jsonify(
        {
            "quizzesCompleted": len(completed),
            "totalPoints": total_points,
            "quizzesOngoing": len([r for r in results if r.ongoing]),
        }
    )


@app.route("/api/quiz-types", methods=["GET"])
@login_required
def list_quiz_types():
    """Return the list of registered quiz types."""
    registry = get_registry()
    return jsonify(
        [
            {"identifier": qt.identifier, "displayName": qt.display_name}
            for qt in registry
        ]
    )


@app.route("/api/rules/<quiz_type>", methods=["GET"])
@login_required
def get_rules(quiz_type):
    """Return raw markdown rules content for a given quiz type."""
    if "/" in quiz_type or "\\" in quiz_type:
        return jsonify({"error": "Invalid quiz type identifier"}), 400

    if not _IDENTIFIER_PATTERN.match(quiz_type):
        return jsonify({"error": "Invalid quiz type identifier"}), 400

    rules_path = Path(__file__).parent / "assets" / "rules" / f"{quiz_type}.md"
    if not rules_path.is_file():
        return jsonify({"error": f"Rules not found for quiz type '{quiz_type}'"}), 404

    content = rules_path.read_text(encoding="utf-8")
    return jsonify({"content": content})


@app.route("/api/stats", methods=["GET"])
@login_required
def get_stats():
    """Return detailed cumulative statistics for the current user."""
    user = get_current_user()
    results = QuizResult.query.filter_by(user_id=user.id).all()

    completed = [r for r in results if not r.ongoing]
    ongoing = [r for r in results if r.ongoing]

    completed_dicts = [
        {
            "hint_difficulty": r.hint_difficulty,
            "remaining_guesses": r.remaining_guesses,
            "destination_id": r.destination_id,
        }
        for r in completed
    ]

    stats = compute_stats(completed_dicts)
    stats["quizzesOngoing"] = len(ongoing)
    return jsonify(stats)


@app.route("/reset-password")
def reset_password_page():
    """Serve the password reset form page."""
    return send_from_directory(STATIC_DIR, "reset_password.html")


@app.route("/")
def index():
    """Serve the main page."""
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/media/<path:filename>")
def serve_media(filename):
    """Serve quiz images from the media directory."""
    return send_from_directory(MEDIA_DIR, filename)


if __name__ == "__main__":
    app.run(debug=False, port=5000, host="0.0.0.0")
