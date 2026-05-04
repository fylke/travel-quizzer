from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Quiz data with 5 travel destinations
quiz_data = [
    {
        "id": 1,
        "destination": "tokyo",
        "hint": "This bustling metropolis is known for its neon lights, traditional temples, and being one of the largest metropolitan areas in the world.",
        "images": [
            "https://images.unsplash.com/photo-1540959375944-7049f642e9a1?w=400&h=300&fit=crop",  # Tokyo skyline
            "https://images.unsplash.com/photo-1522383150241-803fb2dba8d8?w=400&h=300&fit=crop"   # Shibuya crossing
        ],
        "correct_answers": ["tokyo", "japan", "tokyo japan"]
    },
    {
        "id": 2,
        "destination": "paris",
        "hint": "The City of Light is famous for the Eiffel Tower, world-class museums, and being considered the romantic capital of Europe.",
        "images": [
            "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",  # Eiffel Tower
            "https://images.unsplash.com/photo-1427768265524-d42fcd48f149?w=400&h=300&fit=crop"   # Arc de Triomphe
        ],
        "correct_answers": ["paris", "france", "paris france"]
    },
    {
        "id": 3,
        "destination": "new york",
        "hint": "The city that never sleeps is home to the Statue of Liberty, Times Square, and is the financial heart of the United States.",
        "images": [
            "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",  # Manhattan skyline
            "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400&h=300&fit=crop"   # Times Square
        ],
        "correct_answers": ["new york", "usa", "united states", "new york city", "nyc"]
    },
    {
        "id": 4,
        "destination": "sydney",
        "hint": "This Australian city is famous for its Opera House, beautiful beaches, and iconic Sydney Harbour Bridge.",
        "images": [
            "https://images.unsplash.com/photo-1506973404872-a4a41e3c7ca0?w=400&h=300&fit=crop",  # Sydney Opera House
            "https://images.unsplash.com/photo-1506973404872-a4a41e3c7ca0?w=400&h=300&fit=crop"   # Sydney Harbour
        ],
        "correct_answers": ["sydney", "australia"]
    },
    {
        "id": 5,
        "destination": "rome",
        "hint": "The Eternal City is home to the Colosseum, Vatican, and countless historical ruins from ancient times.",
        "images": [
            "https://images.unsplash.com/photo-1552832860-cfb67165eaf0?w=400&h=300&fit=crop",  # Colosseum
            "https://images.unsplash.com/photo-1594331909519-49532b3f7ee0?w=400&h=300&fit=crop" # Vatican
        ],
        "correct_answers": ["rome", "italy", "rome italy"]
    }
]

@app.route('/api/quiz', methods=['GET'])
def get_quiz():
    """Get all quiz questions (without answers for frontend)"""
    sanitized_quiz = []
    for question in quiz_data:
        sanitized_quiz.append({
            "id": question["id"],
            "destination": question["destination"],
            "hint": question["hint"],
            "images": question["images"]
        })
    return jsonify(sanitized_quiz)

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    """Check if the answer is correct and return points"""
    data = request.json
    question_id = data.get('questionId')
    user_answer = data.get('answer', '').lower().strip()
    time_remaining = data.get('timeRemaining', 0)  # in seconds
    
    # Find the question
    question = next((q for q in quiz_data if q['id'] == question_id), None)
    
    if not question:
        return jsonify({"error": "Question not found"}), 404
    
    # Check if answer is correct
    is_correct = user_answer in question['correct_answers']
    
    if is_correct:
        # Calculate points: max 100 at 30 seconds, 10 at 0 seconds
        # Linear scoring: 100 - (30 - timeRemaining) * 3
        max_time = 30
        if time_remaining >= max_time:
            points = 100
        else:
            points = max(10, int(100 - (max_time - time_remaining) * 3))
    else:
        points = 0
    
    return jsonify({
        "correct": is_correct,
        "answer": question['destination'],
        "points": points,
        "timeRemaining": time_remaining
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

if __name__ == '__main__':
    app.run(debug=False, port=5000, host='0.0.0.0')
