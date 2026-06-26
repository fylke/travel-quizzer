"""Authentication blueprint — register, login, logout, password reset."""

import os
import random
import re
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from .auth import (
    csrf_protected,
    generate_csrf_token,
    get_current_user,
    login_user_session,
    user_response,
)
from .email_service import EmailServiceError, send_password_reset_email
from .models import User, db
from .reset_tokens import consume_token, generate_token, validate_token

auth_bp = Blueprint("auth", __name__)

# Basic email format check — intentionally lenient but catches obvious junk
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_FUNNY_NAMES = (Path(__file__).parent / "assets" / "names.txt").read_text().splitlines()
_FUNNY_NAMES = [n for n in _FUNNY_NAMES if n.strip()]


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if not name:
        name = random.choice(_FUNNY_NAMES)

    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(name=name, email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    login_user_session(user)
    return jsonify(user_response(user))


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user_session(user)
    return jsonify(user_response(user))


@auth_bp.route("/api/logout", methods=["POST"])
@csrf_protected
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@auth_bp.route("/api/me", methods=["GET"])
def me():
    user = get_current_user()
    if user is None:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(user_response(user))


@auth_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    if not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format."}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        raw_token = generate_token(user)
        reset_url = f"{request.host_url}reset-password?token={raw_token}"
        try:
            send_password_reset_email(email, reset_url)
        except EmailServiceError as exc:
            current_app.logger.error(
                "Failed to send reset email to %s: %s", email, exc.reason
            )
            return (
                jsonify(
                    {"error": "Failed to send reset email. Please try again later."}
                ),
                500,
            )

    return jsonify(
        {"message": "If that email is registered, a reset link has been sent."}
    )


@auth_bp.route("/api/reset-password/validate", methods=["GET"])
def validate_reset_token_endpoint():
    token = request.args.get("token", "")
    record = validate_token(token)
    if record is not None:
        return jsonify({"valid": True})
    return jsonify({"error": "Invalid or expired reset link."}), 400


@auth_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json or {}
    token = (data.get("token") or "").strip()
    password = data.get("password") or ""

    if not token:
        return jsonify({"error": "Token is required."}), 400

    if not password:
        return jsonify({"error": "Password is required."}), 400

    if len(password) < 8 or len(password) > 128:
        return (
            jsonify({"error": "Password must be between 8 and 128 characters."}),
            400,
        )

    record = validate_token(token)
    if record is None:
        return jsonify({"error": "Invalid or expired reset link."}), 400

    try:
        consume_token(record, password)
    except Exception:
        current_app.logger.exception("Unexpected error during password reset")
        return (
            jsonify({"error": "An unexpected error occurred. Please try again."}),
            500,
        )

    return jsonify({"message": "Your password has been reset. You may now log in."})
