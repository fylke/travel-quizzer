from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import random
from datetime import datetime
from .models import db, Quiz

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_ROOT = os.path.dirname(BASE_DIR)
PROJECT_ROOT = os.path.dirname(SRC_ROOT)
STATIC_DIR = os.path.join(SRC_ROOT, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')
CORS(app)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(PROJECT_ROOT, "data", "quiz_data.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    """Return a random destination along with its first hint and pictures"""
    quizzes = Quiz.query.all()
    if not quizzes:
        return jsonify({"error": "No quiz data available"}), 404
    
    random_question = random.choice(quizzes)
    hint_difficulty = 5  # Start with the hardest hint
    return jsonify({
            "id": random_question.id,
            "hint": random_question.hints.get(str(hint_difficulty)),
            "images": random_question.images
    })

@app.route('/api/hint', methods=['GET'])
def get_hint():
    """Get a specific hint for a question by difficulty level"""
    question_id = request.args.get('questionId', type=int)
    difficulty = request.args.get('difficulty', type=int)
    
    # Validate parameters
    if question_id is None or difficulty is None:
        return jsonify({"error": "Missing questionId or difficulty parameter"}), 400
    
    if not (1 <= difficulty <= 5):
        return jsonify({"error": "Difficulty must be between 1 and 5"}), 400
    
    # Find the question in database
    question = Quiz.query.filter_by(id=question_id).first()
    
    if not question:
        return jsonify({"error": "Question not found"}), 404
    
    # Get the hint for the specified difficulty
    hint_text = question.hints.get(str(difficulty), '')
    
    return jsonify({
        "hint": hint_text,
        "questionId": question_id,
        "difficulty": difficulty
    })

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    """Check if the answer is correct and return points"""
    data = request.json
    question_id = data.get('questionId')
    user_answer = data.get('answer', '').lower().strip()
    hint_difficulty = data.get('hintDifficulty', 0)
    remaining_guesses = data.get('remainingGuesses', 1)
    
    # Find the question in database
    question = Quiz.query.filter_by(id=question_id).first()
    
    if not question:
        return jsonify({"error": "Question not found"}), 404
    
    is_correct = user_answer in question.correct_answers
    
    if is_correct:
        points = hint_difficulty * remaining_guesses
    else:
        points = 0
    
    return jsonify({
        "correct": is_correct,
        "answer": question.destination,
        "points": points
    })

@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory(STATIC_DIR, 'index.html')

if __name__ == '__main__':
    app.run(debug=False, port=5000, host='0.0.0.0')
