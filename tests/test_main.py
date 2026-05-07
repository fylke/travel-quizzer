import unittest

from main import app, quiz_data


class MainAppTestCase(unittest.TestCase):
    def setUp(self):
        app.testing = True
        self.client = app.test_client()

    def test_quiz_endpoint_returns_sanitized_questions(self):
        response = self.client.get('/api/quiz')
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

        question = data[0]
        self.assertIn('id', question)
        self.assertIn('destination', question)
        self.assertIn('hints', question)
        self.assertIsInstance(question['hints'], dict)
        self.assertEqual(len(question['hints']), 5)
        self.assertIn('images', question)
        self.assertNotIn('correct_answers', question)

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

    def test_leaderboard_endpoint_saves_score(self):
        response = self.client.post('/api/leaderboard', json={
            'name': 'Tester',
            'score': 123
        })
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertEqual(data['message'], 'Score saved')
        self.assertEqual(data['name'], 'Tester')
        self.assertEqual(data['score'], 123)

    def test_quiz_data_is_loaded_from_json(self):
        self.assertGreaterEqual(len(quiz_data), 5)
        self.assertEqual(quiz_data[0]['destination'], 'tokyo')
        self.assertIn('correct_answers', quiz_data[0])
        self.assertIn('hints', quiz_data[0])
        self.assertIsInstance(quiz_data[0]['hints'], dict)
        self.assertEqual(len(quiz_data[0]['hints']), 5)


if __name__ == '__main__':
    unittest.main()
