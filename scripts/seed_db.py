"""Seed the database with travel destinations from an external JSON file.

Usage:
    uv run python -m scripts.seed_db

Or inside the container:
    podman exec travel-quizzer uv run --no-project python -m scripts.seed_db

The seed data is loaded from data/destinations.json (gitignored).
See data/destinations.example.json for the expected format.
"""

import json
import sys
import os

# Ensure the project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.exc import OperationalError
from werkzeug.security import generate_password_hash

from backend import app
from backend.models import db, Destination, User

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SEED_FILE = os.path.join(PROJECT_ROOT, "data", "destinations.json")


def _load_destinations(path=None):
    """Load destination data from a JSON file.

    Args:
        path: Path to the JSON file. Defaults to data/destinations.json.

    Returns:
        List of destination dicts, or None if file not found.
    """
    seed_path = path or os.environ.get("SEED_DATA_PATH") or DEFAULT_SEED_FILE
    if not os.path.isfile(seed_path):
        return None
    with open(seed_path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed(destinations=None):
    """Seed the database with destinations and admin users.

    Args:
        destinations: Optional list of destination dicts. If None, loads from
                      data/destinations.json (or SEED_DATA_PATH env var).
    """
    with app.app_context():
        try:
            db.create_all()

            # Seed admin user(s)
            admin_accounts = [
                ("admin@example.com", "adminpass123"),
                ("admin@travel-quizzer.local", "admin123"),
            ]
            for admin_email, admin_password in admin_accounts:
                admin = User.query.filter_by(email=admin_email).first()
                if admin:
                    admin.password_hash = generate_password_hash(admin_password)
                    admin.is_admin = True
                    print(f"  Updated admin user: {admin_email} / {admin_password}")
                else:
                    admin = User(
                        name="Admin",
                        email=admin_email,
                        password_hash=generate_password_hash(admin_password),
                        is_admin=True,
                    )
                    db.session.add(admin)
                    print(f"  Created admin user: {admin_email} / {admin_password}")

            db.session.commit()

            existing = Destination.query.count()
            if existing > 0:
                print(f"Database already has {existing} destination(s). Skipping seed.")
                print("Use --force to seed anyway (existing data will be kept).")
                if "--force" not in sys.argv:
                    return

            # Load destinations from file if not passed directly
            if destinations is None:
                destinations = _load_destinations()
            if not destinations:
                print(
                    "WARNING: No seed data found. Place destination data in "
                    "data/destinations.json or set SEED_DATA_PATH.",
                    file=sys.stderr,
                )
                return

            added = 0
            for dest_data in destinations:
                # Skip if a destination with the same name already exists
                if Destination.query.filter_by(name=dest_data["name"]).first():
                    print(f"  Skipping '{dest_data['name']}' (already exists)")
                    continue

                dest = Destination(
                    name=dest_data["name"],
                    hint1=dest_data["hint1"],
                    hint2=dest_data["hint2"],
                    hint3=dest_data["hint3"],
                    hint4=dest_data["hint4"],
                    hint5=dest_data["hint5"],
                    images=dest_data["images"],
                    correct_answers=dest_data["correct_answers"],
                )
                db.session.add(dest)
                added += 1

            db.session.commit()
            print(
                f"Seeded {added} destination(s). Total now: {Destination.query.count()}"
            )
        except OperationalError as e:
            print(f"ERROR: Seed script failed - {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    seed()
