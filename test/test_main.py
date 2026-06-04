import os
import sys
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(ROOT_DIR, 'src')
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from main import app
from main.models import db, Quiz

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
                q = Quiz(
                    id=item['id'],
                    destination=item['destination'],
                    hints=item['hints'],
                    images=item['images'],
                    correct_answers=item['correct_answers']
                )
                db.session.add(q)
            db.session.commit()
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
        self.assertEqual(len(data), 3) # Should contain id, hint, and images
        self.assertIn('id', data)
        self.assertIn('images', data)
        images = data.get('images')
        self.assertGreaterEqual(len(images), 2)

    def test_check_answer_returns_correct_for_valid_answer(self):
        question = self.quiz_data[0]
        response = self.client.post('/api/check-answer', json={
            'questionId': question['id'],
            'answer': question['correct_answers'][0],
            'hintDifficulty': 5,
            'remainingGuesses': 3
        })
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertTrue(data['correct'])
        self.assertEqual(data['points'], 15)  # Hint difficulty * Remaining guesses
        self.assertEqual(data['answer'], question['destination'])

    def test_check_answer_returns_incorrect_for_invalid_answer(self):
        question = self.quiz_data[0]
        response = self.client.post('/api/check-answer', json={
            'questionId': question['id'],
            'answer': 'not a valid place',
            'hintDifficulty': 0,
            'remainingGuesses': 1
        })
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertFalse(data['correct'])
        self.assertEqual(data['points'], 0)

    def test_check_answer_returns_404_for_missing_question(self):
        response = self.client.post('/api/check-answer', json={
            'questionId': 9999,
            'answer': 'tokyo'
        })
        self.assertEqual(response.status_code, 404)

        data = response.get_json()
        self.assertEqual(data['error'], 'Question not found')

    def test_quiz_data_is_loaded_from_json(self):
        self.assertGreaterEqual(len(self.quiz_data), 5)
        self.assertEqual(self.quiz_data[0]['destination'], 'tokyo')
        self.assertIn('correct_answers', self.quiz_data[0])
        self.assertIn('hints', self.quiz_data[0])
        self.assertIsInstance(self.quiz_data[0]['hints'], dict)
        self.assertEqual(len(self.quiz_data[0]['hints']), 5)


if __name__ == '__main__':
    unittest.main()
