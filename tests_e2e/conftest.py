"""Playwright E2E test configuration.

Starts the Flask app on a free port in a background thread before
the test session, and tears it down afterward.
"""

import threading
import time
import socket

import pytest
from werkzeug.serving import make_server

from main import app
from main.models import db, Destination


def _get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def app_server():
    """Start the Flask app on a random free port and seed test data."""
    port = _get_free_port()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SECRET_KEY"] = "test-secret"

    with app.app_context():
        db.drop_all()
        db.create_all()

        # Seed a test destination
        dest = Destination(
            id=1,
            name="Paris",
            hint1="This city is famous for a tower built in 1889.",
            hint2="It's the capital of France.",
            hint3="Known as the City of Light.",
            hint4="Home to the Louvre museum.",
            hint5="Located on the Seine river.",
            images=["https://example.com/paris1.jpg", "https://example.com/paris2.jpg"],
            correct_answers=["paris"],
        )
        db.session.add(dest)
        db.session.commit()

    server = make_server("127.0.0.1", port, app)
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()

    # Wait for server to be ready
    for _ in range(50):
        try:
            s = socket.create_connection(("127.0.0.1", port), timeout=0.1)
            s.close()
            break
        except OSError:
            time.sleep(0.1)

    yield f"http://127.0.0.1:{port}"

    server.shutdown()


@pytest.fixture(scope="session")
def base_url(app_server):
    """Provide the base_url to pytest-playwright."""
    return app_server


@pytest.fixture()
def clean_db(app_server):
    """Reset user data between tests while keeping destinations."""
    with app.app_context():
        from main.models import User, QuizResult

        QuizResult.query.delete()
        User.query.delete()
        db.session.commit()
    yield
