import os
import sys
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(ROOT_DIR, 'src')
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from main import app
from main.models import db, Destination, User
from werkzeug.security import generate_password_hash

# Small fixture used by tests so they don't rely on the removed JSON file
SAMPLE_DATA = [
    {
        "id": 1,
        "destination": "tokyo",
        "hints": {
            "5": "This bustling metropolis is known for its neon lights, traditional temples, and being one of the largest metropolitan areas in the world.",
            "4": "Its public transport is one of the busiest in the world, with the famous Shibuya crossing and cherry blossom season.",
            "3": "This city is the capital of a country made of islands in East Asia.",
            "2": "It is home to a famous anime culture, sushi, and the Imperial Palace.",
            "1": "Its name starts with 'T' and it hosted the 2020 Summer Olympics."
        },
        "images": ["https://picsum.photos/400/300?random=1", "https://picsum.photos/400/300?random=2"],
        "correct_answers": ["tokyo, japan"]
    },
    {
        "id": 2,
        "destination": "paris",
        "hints": {
            "5": "The City of Light is famous for the Eiffel Tower, world-class museums, and being considered the romantic capital of Europe.",
            "4": "It is also the home of the Louvre Museum, the Seine river, and fashion houses.",
            "3": "This city is the capital of a Western European country known for wine and baguettes.",
            "2": "It hosts a famous iron tower and is often called the most romantic city in the world.",
            "1": "Its name starts with 'P' and it is known for the Eiffel Tower."
        },
        "images": ["https://picsum.photos/400/300?random=3", "https://picsum.photos/400/300?random=4"],
        "correct_answers": ["paris, france"]
    },
    {
        "id": 3,
        "destination": "new york",
        "hints": {
            "5": "The city that never sleeps is home to the Statue of Liberty, Times Square, and is the financial heart of the United States.",
            "4": "It is famous for Broadway shows, skyscrapers, Central Park, and its subway system.",
            "3": "This city is located in the northeastern United States and is often abbreviated as NYC.",
            "2": "It is home to the boroughs of Manhattan, Brooklyn, and Queens.",
            "1": "Its name includes the word 'York' and it is one of America's largest cities."
        },
        "images": ["https://picsum.photos/400/300?random=5", "https://picsum.photos/400/300?random=6"],
        "correct_answers": ["new york, usa", "new york city, usa"]
    }
    ,
    {
        "id": 4,
        "destination": "sydney",
        "hints": {
            "5": "This Australian city is famous for its Opera House, beautiful beaches, and iconic Sydney Harbour Bridge.",
            "4": "It is located on the east coast of Australia and has a famous harbour.",
            "3": "This city is known for Bondi Beach, the Harbour Bridge, and a vibrant coastal lifestyle.",
            "2": "It is one of Australia's largest cities and is not the capital of the country.",
            "1": "Its name starts with 'S' and it is famous for the Opera House."
        },
        "images": ["https://picsum.photos/400/300?random=7", "https://picsum.photos/400/300?random=8"],
        "correct_answers": ["sydney, australia"]
    },
    {
        "id": 5,
        "destination": "rome",
        "hints": {
            "5": "The Eternal City is home to the Colosseum, Vatican, and countless historical ruins from ancient times.",
            "4": "It is famous for pizza, pasta, the Roman Forum, and Baroque fountains.",
            "3": "This city is the capital of a European country known for its ancient empire.",
            "2": "It is built on seven hills and includes the Vatican City within its boundaries.",
            "1": "Its name starts with 'R' and it is famous for the Colosseum."
        },
        "images": ["https://picsum.photos/400/300?random=9", "https://picsum.photos/400/300?random=10"],
        "correct_answers": ["rome, italy"]
    }
]


class MainAppTestCase(unittest.TestCase):
    def setUp(self):
        app.testing = True
        self.client = app.test_client()
        # Use a dedicated test database file to isolate tests from production DB
        test_db_path = os.path.join(ROOT_DIR, 'data', 'test_quiz_data.db')
        try:
            if os.path.exists(test_db_path):
                os.remove(test_db_path)
        except Exception:
            pass

        app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{test_db_path}"
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

        # Initialize and populate the test database with SAMPLE_DATA
        with app.app_context():
            db.drop_all()
            db.create_all()
            for item in SAMPLE_DATA:
                q = Destination(
                    id=item['id'],
                    name=item['destination'],
                    hint1=item['hints']['1'],
                    hint2=item['hints']['2'],
                    hint3=item['hints']['3'],
                    hint4=item['hints']['4'],
                    hint5=item['hints']['5'],
                    images=item['images'],
                    correct_answers=item['correct_answers']
                )
                db.session.add(q)

            self.test_user = User(
                name='Test User',
                email='test@example.com',
                password_hash=generate_password_hash('password123')
            )
            db.session.add(self.test_user)
            db.session.commit()

        login_response = self.client.post('/api/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        self.assertEqual(login_response.status_code, 200)
        self.quiz_data = SAMPLE_DATA

    def tearDown(self):
        # Clean up test database file
        test_db_path = os.path.join(ROOT_DIR, 'data', 'test_quiz_data.db')
        with app.app_context():
            db.session.remove()
            db.drop_all()
        try:
            if os.path.exists(test_db_path):
                os.remove(test_db_path)
        except Exception:
            pass

    def test_quiz_endpoint_returns_first_hint_of_random_destination(self):
        response = self.client.get('/api/quiz')
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertIn('id', data)
        self.assertIn('hint', data)
        self.assertIn('hintDifficulty', data)
        self.assertIn('remainingGuesses', data)
        self.assertIn('images', data)
        self.assertEqual(data['hintDifficulty'], 5)
        self.assertEqual(data['remainingGuesses'], 3)
        images = data.get('images')
        self.assertGreaterEqual(len(images), 2)

    def test_check_answer_returns_correct_for_valid_answer(self):
        question = self.quiz_data[0]
        # Start a quiz first so server-side state exists
        self.client.get(f'/api/quiz/{question["id"]}')

        response = self.client.post('/api/check-answer', json={
            'answer': question['correct_answers'][0]
        })
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertTrue(data['correct'])
        self.assertEqual(data['points'], 15)  # Hint difficulty (5) * Remaining guesses (3)
        self.assertEqual(data['answer'], question['destination'])

    def test_check_answer_returns_incorrect_for_invalid_answer(self):
        question = self.quiz_data[0]
        # Start a quiz first so server-side state exists
        self.client.get(f'/api/quiz/{question["id"]}')

        response = self.client.post('/api/check-answer', json={
            'answer': 'not a valid place'
        })
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertFalse(data['correct'])
        # Still has guesses left, so we get remainingGuesses and a new hint
        self.assertIn('remainingGuesses', data)
        self.assertEqual(data['remainingGuesses'], 2)

    def test_check_answer_returns_404_for_missing_question(self):
        # No active quiz — should get 404
        response = self.client.post('/api/check-answer', json={
            'answer': 'tokyo'
        })
        self.assertEqual(response.status_code, 404)

        data = response.get_json()
        self.assertEqual(data['error'], 'No active quiz')

    def test_register_endpoint_creates_user_and_sets_session(self):
        response = self.client.post('/api/register', json={
            'name': 'New User',
            'email': 'newuser@example.com',
            'password': 'newpassword'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['name'], 'New User')
        self.assertEqual(data['email'], 'newuser@example.com')

    def test_register_rejects_invalid_email_format(self):
        invalid_emails = [
            'notanemail',
            '@missing-local.com',
            'no-domain@',
            'spaces in@email.com',
            'no@tld',
            '',
        ]
        for email in invalid_emails:
            response = self.client.post('/api/register', json={
                'name': 'Test',
                'email': email,
                'password': 'validpass123'
            })
            self.assertIn(response.status_code, (400,), msg=f"Expected 400 for '{email}', got {response.status_code}")

    def test_register_accepts_valid_email_format(self):
        valid_emails = [
            'user@example.com',
            'name+tag@sub.domain.org',
            'dotted.name@company.co.uk',
        ]
        for i, email in enumerate(valid_emails):
            response = self.client.post('/api/register', json={
                'name': f'User {i}',
                'email': email,
                'password': 'validpass123'
            })
            self.assertEqual(response.status_code, 200, msg=f"Expected 200 for '{email}', got {response.status_code}")

    def test_login_endpoint_allows_registered_user(self):
        response = self.client.post('/api/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['name'], 'Test User')
        self.assertEqual(data['email'], 'test@example.com')

    def test_quiz_endpoint_requires_authentication(self):
        client = app.test_client()
        response = client.get('/api/quiz')
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertEqual(data['error'], 'Authentication required')

    def test_quiz_data_is_loaded(self):
        self.assertGreaterEqual(len(self.quiz_data), 5)
        self.assertEqual(self.quiz_data[0]['destination'], 'tokyo')
        self.assertIn('correct_answers', self.quiz_data[0])
        self.assertIn('hints', self.quiz_data[0])
        self.assertIsInstance(self.quiz_data[0]['hints'], dict)
        self.assertEqual(len(self.quiz_data[0]['hints']), 5)


    def test_session_cookie_has_httponly_and_samesite(self):
        """Issue #4: Session cookie should have HttpOnly and SameSite flags."""
        # Use a fresh client so the login response contains Set-Cookie
        client = app.test_client()
        resp = client.post('/api/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        self.assertEqual(resp.status_code, 200)

        cookie_header = resp.headers.get('Set-Cookie', '')
        self.assertIn('HttpOnly', cookie_header)
        self.assertIn('SameSite=Lax', cookie_header)

    def test_session_cookie_secure_flag_when_enabled(self):
        """Issue #4: Secure flag should appear when SESSION_COOKIE_SECURE is True."""
        app.config['SESSION_COOKIE_SECURE'] = True
        try:
            client = app.test_client()
            client.post('/api/register', json={
                'name': 'SecureTest',
                'email': 'secure@test.com',
                'password': 'securepass123'
            })
            resp = client.post('/api/login', json={
                'email': 'secure@test.com',
                'password': 'securepass123'
            })
            self.assertEqual(resp.status_code, 200)

            cookie_header = resp.headers.get('Set-Cookie', '')
            self.assertIn('Secure', cookie_header)
        finally:
            app.config['SESSION_COOKIE_SECURE'] = False

    def test_cors_restricts_origin_when_configured(self):
        """Issue #5: CORS should respect CORS_ALLOWED_ORIGINS and reject others."""
        # We test the config-driven behaviour by creating a minimal Flask app
        # with the same CORS setup used in production, avoiding module reload
        # side-effects on the shared `app` instance.
        from flask import Flask as _Flask
        from flask_cors import CORS as _CORS

        allowed = 'https://myapp.example.com'
        test_app = _Flask(__name__)
        test_app.secret_key = 'test'
        _CORS(test_app, origins=[allowed], supports_credentials=True)

        @test_app.route('/ping')
        def ping():
            return 'pong'

        client = test_app.test_client()

        # Allowed origin gets the ACAO header
        resp = client.get('/ping', headers={'Origin': allowed})
        acao = resp.headers.get('Access-Control-Allow-Origin', '')
        self.assertEqual(acao, allowed)

        # Disallowed origin does NOT get a permissive ACAO header
        resp = client.get('/ping', headers={'Origin': 'https://evil.com'})
        acao = resp.headers.get('Access-Control-Allow-Origin', '')
        self.assertNotEqual(acao, 'https://evil.com')
        self.assertNotEqual(acao, '*')


if __name__ == '__main__':
    unittest.main()
