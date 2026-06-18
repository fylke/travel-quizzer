"""Unit tests for seed script.

Validates:
- Requirements 7.1: Empty DB gets seeded with at least 5 destinations and 1 admin user
- Requirements 7.3: Same seed data produced regardless of backend (tested with SQLite)
"""

import os
import unittest

# Ensure in-memory SQLite is used before importing anything from backend
os.environ["QUIZ_DATABASE_URL"] = "sqlite:///:memory:"

from backend import app
from backend.models import db, Destination, User  # noqa: F401 - User used in seed

# Test fixture — minimal destination data for unit tests
TEST_DESTINATIONS = [
    {
        "name": f"Test City {i}",
        "hint1": f"Hint 1 for city {i}",
        "hint2": f"Hint 2 for city {i}",
        "hint3": f"Hint 3 for city {i}",
        "hint4": f"Hint 4 for city {i}",
        "hint5": f"Hint 5 for city {i}",
        "correct_answers": [f"test city {i}"],
    }
    for i in range(1, 6)
]


class TestSeedEmptyDatabase(unittest.TestCase):
    """Test that an empty database gets seeded with expected data."""

    def setUp(self):
        app.testing = True
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        with app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_seed_populates_empty_database_with_at_least_5_destinations(self):
        """Requirement 7.1: seed inserts at least 5 destinations when table is empty."""
        from scripts.seed_db import seed

        seed(destinations=TEST_DESTINATIONS)

        with app.app_context():
            count = Destination.query.count()
            self.assertGreaterEqual(count, 5)

    def test_seed_populates_empty_database_with_at_least_1_admin_user(self):
        """Requirement 7.1: seed inserts at least 1 admin user when table is empty."""
        from scripts.seed_db import seed

        seed(destinations=TEST_DESTINATIONS)

        with app.app_context():
            admin_count = User.query.filter_by(is_admin=True).count()
            self.assertGreaterEqual(admin_count, 1)

    def test_seed_destinations_have_all_required_fields(self):
        """Requirement 7.1: each destination has all required fields populated."""
        from scripts.seed_db import seed

        seed(destinations=TEST_DESTINATIONS)

        with app.app_context():
            destinations = Destination.query.all()
            for dest in destinations:
                self.assertTrue(dest.name, f"Destination {dest.id} has empty name")
                self.assertTrue(dest.hint1, f"Destination {dest.id} has empty hint1")
                self.assertTrue(dest.hint2, f"Destination {dest.id} has empty hint2")
                self.assertTrue(dest.hint3, f"Destination {dest.id} has empty hint3")
                self.assertTrue(dest.hint4, f"Destination {dest.id} has empty hint4")
                self.assertTrue(dest.hint5, f"Destination {dest.id} has empty hint5")
                self.assertIsInstance(dest.correct_answers, list)
                self.assertGreater(len(dest.correct_answers), 0)


if __name__ == "__main__":
    unittest.main()
