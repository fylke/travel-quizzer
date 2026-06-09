# ✈️ Travel Quiz Webapp

A fun interactive quiz game where you guess travel destinations based on hints and images. Earn more points for faster correct answers!

## Features

- **5 Travel Destinations** to guess: Tokyo, Paris, New York, Sydney, and Rome
- **2 Images per Question** to help with identification
- **Hint System** with descriptive clues about each destination
- **Multi-level Hint System** - 5 difficulty levels of hints (hardest to easiest)
- **Dynamic Scoring** - points based on hint difficulty and remaining guesses
- **Responsive Design** - works on desktop and mobile devices
- **Real-time Feedback** - instant answer validation with points calculation

## Scoring System

- **Correct Answer**: `hint_difficulty × remaining_guesses` points
- **Wrong Answer**: 0 points
- **Hint Difficulty Levels**: 1-5 (5 is hardest hint, 1 is easiest)
- **Remaining Guesses**: Number of attempts left for the question
- **Example**: Correct answer with difficulty 5 and 3 remaining guesses = 15 points

## Project Structure

```
travel-quizzer/
├── src/
│   └── main/
│       ├── __init__.py        # Flask app initialization
│       └── __main__.py        # Entry point
├── static/
│   ├── index.html            # Main HTML page
│   ├── style.css             # Styling
│   └── script.js             # Frontend logic
├── data/
│   └── quiz_data.json        # Quiz questions and data
├── test/
│   └── test_main.py          # Test suite
├── pyproject.toml            # Poetry configuration
├── Dockerfile                # Container build configuration
├── docker-compose.yml        # Docker Compose orchestration
└── README.md                 # This file
```

## Setup Instructions

### Prerequisites
- Python 3.10 or higher
- Git

### Installation

1. **Clone and enter the project:**
   ```bash
   git clone <repo-url>
   cd travel-quizzer
   ```

2. **Create a virtual environment and install dependencies:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

3. **(Optional) Auto-activate the venv with direnv:**

   If you'd like the virtual environment to activate automatically whenever you enter the project directory:

   ```bash
   # Install direnv (Ubuntu/Debian)
   sudo apt install direnv

   # Add the hook to your shell (bash)
   echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
   source ~/.bashrc

   # Create .envrc and allow it
   echo 'source .venv/bin/activate' > .envrc
   direnv allow
   ```

   Now the venv activates/deactivates automatically as you enter/leave the directory.

## Running Unit Tests

From the project root (with the venv active), run:
```bash
python -m pytest test/
```

Or a specific test file:
```bash
python -m pytest test/test_main.py
```

## Running the Application

### Local Development

1. **Start the Flask server:**
   ```bash
   python -m main
   ```

   You should see output like:
   ```
   * Running on http://0.0.0.0:5000
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:5000
   ```

3. **Enter your name and start the quiz!**

### Docker

#### Prerequisites
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))

#### Running with Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:9696
   ```

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

#### Running with Docker Directly

1. **Build the image:**
   ```bash
   docker build -t travel-quizzer:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -p 9696:5000 travel-quizzer:latest
   ```

3. **Open your browser and go to:**
   ```
   http://localhost:9696
   ```

4. **Stop the container:**
   ```bash
   docker stop <container_id>
   ```

#### Pushing to a Docker Registry

For CI/CD or sharing with others:

1. **Tag the image:**
   ```bash
   docker tag travel-quizzer:latest <your_registry>/<your_username>/travel-quizzer:latest
   ```
   Example: `docker tag travel-quizzer:latest docker.io/myusername/travel-quizzer:latest`

2. **Login to your registry:**
   ```bash
   docker login
   ```

3. **Push the image:**
   ```bash
   docker push <your_registry>/<your_username>/travel-quizzer:latest
   ```

4. **Pull and run from registry:**
   ```bash
   docker run -p 9696:5000 <your_registry>/<your_username>/travel-quizzer:latest
   ```



## How to Play

1. Enter your name and click "Start Quiz"
2. Read the hint carefully
3. Look at the two images provided
4. Enter your guess (destination name)
5. Your answer is validated and points are calculated
6. Move to the next question
7. After all 5 questions, see your final score and ranking

## API Endpoints

### POST `/api/register`
Create a new account and start an authenticated session:
```json
{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "s3cur3pass"
}
```

Response:
```json
{
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
}
```

### POST `/api/login`
Log in using email and password:
```json
{
    "email": "jane@example.com",
    "password": "s3cur3pass"
}
```

Response:
```json
{
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
}
```

### GET `/api/me`
Get the current authenticated user:
```json
{
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
}
```

### GET `/api/quiz`
Returns a random quiz question with initial hint (difficulty 5) and images:
```json
{
    "id": 1,
    "hint": "This bustling metropolis is known for...",
    "images": ["https://picsum.photos/400/300?random=1", "https://picsum.photos/400/300?random=2"]
}
```

### GET `/api/hint`
Get a specific hint for a question by difficulty level (1-5):
```
GET /api/hint?questionId=1&difficulty=3
```

Response:
```json
{
    "hint": "This city is the capital of a country...",
    "questionId": 1,
    "difficulty": 3
}
```

### POST `/api/check-answer`
Submit an answer and get validation:
```json
{
    "questionId": 1,
    "answer": "tokyo",
    "hintDifficulty": 5,
    "remainingGuesses": 3
}
```

Response:
```json
{
    "correct": true,
    "answer": "tokyo",
    "points": 15
}
```

## Customization

### Add More Destinations
Edit `data/quiz_data.json` to add more travel destinations:

```json
{
    "id": 6,
    "destination": "barcelona",
    "hints": {
        "5": "Hardest hint about Barcelona...",
        "4": "Medium-hard hint...",
        "3": "Medium hint...",
        "2": "Easier hint...",
        "1": "Easiest hint..."
    },
    "images": ["https://picsum.photos/400/300?random=11", "https://picsum.photos/400/300?random=12"],
    "correct_answers": ["barcelona, spain"]
}
```

### Adjust Scoring Formula
Modify the scoring calculation in `src/main/__init__.py`:
```python
if is_correct:
    points = hint_difficulty * remaining_guesses  # Customize this formula
else:
    points = 0
```

## Technologies Used

- **Backend**: Flask (Python web framework)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Images**: Picsum (free placeholder images)
- **CORS**: Flask-CORS for cross-origin requests

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Database for persistent leaderboard
- [ ] User authentication
- [ ] Multiplayer mode
- [ ] More destinations and categories
- [ ] Configurable categories/difficulty levels
- [ ] Achievement badges
- [ ] Sound effects
- [ ] Mobile app version
- [ ] Timed rounds option

## License

MIT License - feel free to use and modify this project!

## Support

If you encounter any issues:
1. Make sure Python 3.10+ is installed
2. Ensure the venv is active: `source .venv/bin/activate`
3. Ensure dependencies are installed: `pip install -e .`
4. Check that the server is running on `http://localhost:5000`
5. Check browser console for any JavaScript errors (F12 → Console)

Enjoy the quiz! 🌍✨
