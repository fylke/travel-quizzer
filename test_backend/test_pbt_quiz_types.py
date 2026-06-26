"""Property-based tests for the quiz-type-selection feature.

Feature: quiz-type-selection
Uses Hypothesis to validate quiz type registry logic.
"""

import os
import re
import unittest
from unittest.mock import patch

os.environ.setdefault("QUIZ_DATABASE_URL", "sqlite:///:memory:")

from hypothesis import given, settings
from hypothesis import strategies as st

from backend.quiz_types import QuizType, validate_registry

_IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")

# Strategy for valid identifiers: must match ^[a-z0-9][a-z0-9_-]{0,63}$
_valid_identifier = st.from_regex(r"[a-z0-9][a-z0-9_\-]{0,63}", fullmatch=True)


def _make_quiz_type(identifier: str, display_name: str = "Test") -> QuizType:
    """Create a QuizType with a valid structure for testing."""
    return QuizType(
        identifier=identifier,
        display_name=display_name,
        rules_file=f"{identifier}.md",
        source_table=identifier,
    )


# ---------------------------------------------------------------------------
# Property 1: Identifier validation accepts only valid patterns
# Feature: quiz-type-selection, Property 1: Identifier validation accepts only valid patterns
# Validates: Requirements 1.3, 3.5
# ---------------------------------------------------------------------------


class PropertyTestIdentifierValidation(unittest.TestCase):
    """Property 1: Identifier validation accepts only valid patterns.

    For any string, the identifier validation function SHALL accept it if and
    only if it matches the pattern ^[a-z0-9][a-z0-9_-]{0,63}$ (1-64 characters,
    starting with lowercase alphanumeric, followed by lowercase alphanumeric,
    hyphens, or underscores). Any string not matching this pattern SHALL be
    rejected.

    **Validates: Requirements 1.3, 3.5**
    """

    @settings(max_examples=8, deadline=5000)
    @given(identifier=st.text(min_size=0, max_size=200))
    def test_identifier_validation_accepts_only_valid_patterns(
        self, identifier: str
    ) -> None:
        """For any arbitrary string used as an identifier, validate_registry
        SHALL report an identifier error iff the string does NOT match
        ^[a-z0-9][a-z0-9_-]{0,63}$.

        # Feature: quiz-type-selection, Property 1: Identifier validation accepts only valid patterns
        **Validates: Requirements 1.3, 3.5**
        """
        # Create a QuizType with the generated identifier and otherwise valid
        # fields. Use a known-existing rules_file to isolate identifier
        # validation from rules_file existence checks.
        qt = QuizType(
            identifier=identifier,
            display_name="Valid Name",
            rules_file="countries.md",
            source_table="countries",
        )

        errors = validate_registry([qt])

        # Filter to only identifier-related errors
        identifier_errors = [e for e in errors if "Invalid identifier" in e]

        matches_pattern = bool(_IDENTIFIER_PATTERN.match(identifier))

        if matches_pattern:
            # Valid identifier: no identifier errors should be reported
            self.assertEqual(
                len(identifier_errors),
                0,
                f"Identifier {identifier!r} matches the pattern but got "
                f"errors: {identifier_errors}",
            )
        else:
            # Invalid identifier: exactly one identifier error should be reported
            self.assertEqual(
                len(identifier_errors),
                1,
                f"Identifier {identifier!r} does NOT match the pattern but got "
                f"{len(identifier_errors)} identifier errors: {identifier_errors}",
            )


# ---------------------------------------------------------------------------
# Property 2: Duplicate identifier detection
# Feature: quiz-type-selection, Property 2: Duplicate identifier detection
# Validates: Requirements 1.5
# ---------------------------------------------------------------------------


class PropertyTestDuplicateIdentifierDetection(unittest.TestCase):
    """Property 2: Duplicate identifier detection.

    For any list of QuizType entries where at least two entries share the same
    identifier, the registry validation function SHALL return an error that
    references the duplicated identifier. For any list with all-unique
    identifiers (that are otherwise valid), validation SHALL NOT report a
    duplicate error.

    **Validates: Requirements 1.5**
    """

    @settings(max_examples=8, deadline=5000)
    @given(
        identifiers=st.lists(_valid_identifier, min_size=2, max_size=10, unique=True),
        dup_index=st.integers(min_value=0),
    )
    @patch("backend.quiz_types.Path.is_file", return_value=True)
    def test_duplicates_detected(self, mock_is_file, identifiers, dup_index):
        """When duplicates exist, validation reports a duplicate error.

        # Feature: quiz-type-selection, Property 2: Duplicate identifier detection
        **Validates: Requirements 1.5**
        """
        # Pick one identifier to duplicate
        source_index = dup_index % len(identifiers)
        duplicated_id = identifiers[source_index]

        # Build a list with a duplicate appended
        quiz_types = [_make_quiz_type(ident) for ident in identifiers]
        quiz_types.append(_make_quiz_type(duplicated_id, display_name="Duplicate"))

        errors = validate_registry(quiz_types)

        # Should contain at least one error mentioning the duplicated identifier
        duplicate_errors = [
            e for e in errors if "Duplicate" in e and duplicated_id in e
        ]
        self.assertTrue(
            len(duplicate_errors) > 0,
            f"Expected duplicate error for '{duplicated_id}', got errors: {errors}",
        )

    @settings(max_examples=8, deadline=5000)
    @given(
        identifiers=st.lists(_valid_identifier, min_size=1, max_size=10, unique=True),
    )
    @patch("backend.quiz_types.Path.is_file", return_value=True)
    def test_no_duplicates_no_error(self, mock_is_file, identifiers):
        """When all identifiers are unique, no duplicate error is reported.

        # Feature: quiz-type-selection, Property 2: Duplicate identifier detection
        **Validates: Requirements 1.5**
        """
        quiz_types = [_make_quiz_type(ident) for ident in identifiers]

        errors = validate_registry(quiz_types)

        duplicate_errors = [e for e in errors if "Duplicate" in e]
        self.assertEqual(
            duplicate_errors,
            [],
            f"Expected no duplicate errors for unique identifiers {identifiers}, "
            f"but got: {duplicate_errors}",
        )


# ---------------------------------------------------------------------------
# Property 3: Rules content round-trip preservation
# Feature: quiz-type-selection, Property 3: Rules content round-trip preservation
# Validates: Requirements 3.4
# ---------------------------------------------------------------------------


class PropertyTestRulesContentRoundTrip(unittest.TestCase):
    """Property 3: Rules content round-trip preservation.

    For any string written to a rules markdown file, when that file is requested
    through the rules API endpoint, the returned content SHALL be byte-for-byte
    identical to the original string.

    **Validates: Requirements 3.4**
    """

    def setUp(self):
        from backend import app
        from backend.models import db, User
        from werkzeug.security import generate_password_hash

        app.testing = True
        self.app = app
        self.client = app.test_client()
        self._created_files: list[str] = []

        # Set up an in-memory database with a test user for authentication
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        with app.app_context():
            db.drop_all()
            db.create_all()
            user = User(
                name="Test User",
                email="pbt@example.com",
                password_hash=generate_password_hash("password123"),
            )
            db.session.add(user)
            db.session.commit()

        # Log in to satisfy @login_required
        resp = self.client.post(
            "/api/login",
            json={"email": "pbt@example.com", "password": "password123"},
        )
        assert resp.status_code == 200

    def tearDown(self):
        """Remove any temp rules files created during tests."""
        for path in self._created_files:
            try:
                os.remove(path)
            except OSError:
                pass

    def _write_rules_file(self, quiz_type: str, content: str) -> str:
        """Write content to a rules file and track it for cleanup."""
        rules_dir = os.path.join(
            os.path.dirname(__file__), "..", "backend", "assets", "rules"
        )
        filepath = os.path.join(rules_dir, f"{quiz_type}.md")
        filepath = os.path.abspath(filepath)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        self._created_files.append(filepath)
        return filepath

    @settings(max_examples=8, deadline=5000)
    @given(content=st.text(alphabet=st.characters(categories=("L", "M", "N", "P", "S", "Z")), min_size=0, max_size=500))
    def test_rules_content_round_trip_preservation(self, content: str) -> None:
        """For any text content written to a rules file, fetching via the API
        SHALL return byte-for-byte identical content.

        # Feature: quiz-type-selection, Property 3: Rules content round-trip preservation
        **Validates: Requirements 3.4**
        """
        # Use a fixed valid quiz type identifier for the temp file
        quiz_type = "pbttest"

        # Write content to a temp rules file
        self._write_rules_file(quiz_type, content)

        try:
            # Fetch via the API
            response = self.client.get(f"/api/rules/{quiz_type}")
            self.assertEqual(response.status_code, 200)

            data = response.get_json()
            self.assertIn("content", data)

            # Assert byte-for-byte identity
            self.assertEqual(data["content"], content)
        finally:
            # Clean up the file immediately so it doesn't interfere with next example
            filepath = os.path.join(
                os.path.dirname(__file__),
                "..",
                "backend",
                "assets",
                "rules",
                f"{quiz_type}.md",
            )
            filepath = os.path.abspath(filepath)
            try:
                os.remove(filepath)
            except OSError:
                pass
            if filepath in self._created_files:
                self._created_files.remove(filepath)


if __name__ == "__main__":
    unittest.main()
