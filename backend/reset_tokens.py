"""Reset token service — generates, validates, and consumes password reset tokens."""

import hashlib
import secrets
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from .models import PasswordResetToken, db


def generate_token(user) -> str:
    """Create a new reset token for user, invalidate prior tokens, persist record.

    Returns the raw (unhashed) token string.
    """
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()

    # Invalidate all existing unused tokens for this user
    PasswordResetToken.query.filter_by(user_id=user.id, consumed=False).delete()

    now = datetime.utcnow()
    token_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + timedelta(minutes=15),
        consumed=False,
    )
    db.session.add(token_record)
    db.session.commit()

    return raw


def validate_token(raw_token: str) -> "PasswordResetToken | None":
    """Validate a raw token string.

    Hashes raw_token and looks up the corresponding PasswordResetToken record
    where consumed=False. Returns the record if it exists and has not expired;
    returns None otherwise.
    """
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = PasswordResetToken.query.filter_by(
        token_hash=token_hash, consumed=False
    ).first()
    if record is None:
        return None
    if record.expires_at < datetime.utcnow():
        return None
    return record


def consume_token(token_record: "PasswordResetToken", new_password: str) -> None:
    """Update user's password hash, set password_changed_at, mark token consumed.

    Args:
        token_record: A valid PasswordResetToken record (not expired, not consumed).
        new_password: The new plaintext password to hash and store.
    """
    user = token_record.user
    user.password_hash = generate_password_hash(new_password)
    user.password_changed_at = datetime.utcnow()
    token_record.consumed = True
    db.session.commit()
