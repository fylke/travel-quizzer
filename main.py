from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QUIZ_DATA_PATH = os.path.join(BASE_DIR, 'data/quiz_data.json')

with open(QUIZ_DATA_PATH, 'r', encoding='utf-8') as f:
    quiz_data = json.load(f)

@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    """Get all quiz questions (without answers for frontend)"""
    sanitized_quiz = []
    for question in quiz_data:
        sanitized_quiz.append({
            "id": question["id"],
            "destination": question["destination"],
            "hints": question["hints"],
            "images": question["images"]
        })
    return jsonify(sanitized_quiz)

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    """Check if the answer is correct and return points"""
    data = request.json
    question_id = data.get('questionId')
    user_answer = data.get('answer', '').lower().strip()
    hint_index = data.get('hintIndex', 0)
    
    # Find the question
    question = next((q for q in quiz_data if q['id'] == question_id), None)
    
    if not question:
        return jsonify({"error": "Question not found"}), 404
    
    # Check if answer is correct
    is_correct = user_answer in question['correct_answers']
    
    points_by_hint = [100, 80, 60, 40, 20]
    index = min(max(int(hint_index), 0), len(points_by_hint) - 1)
    
    if is_correct:
        points = points_by_hint[index]
    else:
        points = 0
    
    return jsonify({
        "correct": is_correct,
        "answer": question['destination'],
        "points": points
    })

@app.route('/api/leaderboard', methods=['POST'])
def save_score():
    """Save a quiz completion score"""
    data = request.json
    player_name = data.get('name', 'Anonymous')
    total_score = data.get('score', 0)
    
    # In a real app, this would save to a database
    return jsonify({
        "message": "Score saved",
        "name": player_name,
        "score": total_score
    })

@app.route('/')
def index():
    """Serve the main page"""
    from flask import send_from_directory
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    from flask import send_from_directory
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=False, port=5000, host='0.0.0.0')
