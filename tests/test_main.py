import unittest

from main import app, quiz_data


class MainAppTestCase(unittest.TestCase):
    def setUp(self):
        app.testing = True
        self.client = app.test_client()

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
        question = quiz_data[0]
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
        question = quiz_data[0]
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
        self.assertGreaterEqual(len(quiz_data), 5)
        self.assertEqual(quiz_data[0]['destination'], 'tokyo')
        self.assertIn('correct_answers', quiz_data[0])
        self.assertIn('hints', quiz_data[0])
        self.assertIsInstance(quiz_data[0]['hints'], dict)
        self.assertEqual(len(quiz_data[0]['hints']), 5)


if __name__ == '__main__':
    unittest.main()
