"""Authentication and CSRF utilities shared across blueprints."""

import secrets
from datetime import UTC, datetime
from functools import wraps

from flask import jsonify, request, session

from .models import User, db


def generate_csrf_token():
    """Generate a new CSRF token and store it in the session."""
    token = secrets.token_hex(32)
    session["csrf_token"] = token
    return token


def check_csrf_token():
    """Validate the CSRF token from the X-CSRF-Token header against the session."""
    token = request.headers.get("X-CSRF-Token", "")
    expected = session.get("csrf_token", "")
    if not expected or not secrets.compare_digest(token, expected):
        return False
    return True


def csrf_protected(fn):
    """Decorator that rejects requests with a missing or invalid CSRF token."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not check_csrf_token():
            return jsonify({"error": "Invalid or missing CSRF token"}), 403
        return fn(*args, **kwargs)

    return wrapper


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = db.session.get(User, user_id)
    if user is None:
        return None
    if user.password_changed_at is not None:
        logged_in_at_str = session.get("logged_in_at")
        if not logged_in_at_str:
            return None
        logged_in_at = datetime.fromisoformat(logged_in_at_str)
        # password_changed_at is naive UTC from the DB — make it aware for comparison
        changed_at = user.password_changed_at.replace(tzinfo=UTC)
        if logged_in_at < changed_at:
            return None
    return user


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


def user_response(user):
    """Build the standard user JSON response dict (includes a fresh CSRF token)."""
    csrf_token = generate_csrf_token()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "isAdmin": user.is_admin,
        "csrfToken": csrf_token,
    }


def login_user_session(user):
    """Set session fields for a logged-in user."""
    session["user_id"] = user.id
    session["logged_in_at"] = datetime.now(UTC).isoformat()
