# ✈️ Travel Quiz Webapp

A fun interactive quiz game where you guess travel destinations based on hints and images. Earn more points for faster correct answers!

## Features

- **5 Travel Destinations** to guess: Tokyo, Paris, New York, Sydney, and Rome
- **2 Images per Question** to help with identification
- **Hint System** with descriptive clues about each destination
- **Simple Scoring** - 100 points for correct answers, 0 for incorrect
- **Responsive Design** - works on desktop and mobile devices
- **Real-time Feedback** - instant answer validation with points calculation

## Scoring System

- **Correct Answer**: 100 points per question (500 total)
- **Wrong Answer**: 0 points
- **Simple and Fair**: No time pressure, focus on knowledge

## Project Structure

```
travel-quizzer/
├── main.py                 # Flask backend server
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container build configuration
├── docker-compose.yml      # Docker Compose orchestration
├── .dockerignore           # Files excluded from Docker build
├── static/
│   ├── index.html         # Main HTML page
│   ├── style.css          # Styling
│   └── script.js          # Frontend logic
└── README.md              # This file
```

## Setup Instructions

### Prerequisites
- Python 3.7+
- pip or pipenv

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd c:\Users\Magnusle\code\travel-quizzer
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Local Development

1. **Start the Flask server:**
   ```bash
   python main.py
   ```

   You should see output like:
   ```
   * Running on http://127.0.0.1:5000
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

#### Docker File Structure

```
travel-quizzer/
├── Dockerfile              # Container build configuration
├── docker-compose.yml      # Docker Compose orchestration
├── .dockerignore          # Files excluded from Docker build
├── main.py                # Flask backend server
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html        # Main HTML page
│   ├── style.css         # Styling
│   └── script.js         # Frontend logic
└── README.md             # This file
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

### GET `/api/quiz`
Returns all quiz questions without answers:
```json
[
    {
        "id": 1,
        "destination": "tokyo",
        "hint": "This bustling metropolis...",
        "images": ["url1", "url2"]
    }
]
```

### POST `/api/check-answer`
Submit an answer and get validation:
```json
{
    "questionId": 1,
    "answer": "tokyo",
    "timeRemaining": 25
}
```

Response:
```json
{
    "correct": true,
    "answer": "tokyo",
    "points": 85,
    "timeRemaining": 25
}
```

## Customization

### Add More Destinations
Edit the `quiz_data` list in `main.py` to add more travel destinations:

```python
{
    "id": 6,
    "destination": "barcelona",
    "hint": "Your custom hint here...",
    "images": ["image_url_1", "image_url_2"],
    "correct_answers": ["barcelona", "spain"]
}
```

### Change Timer Duration
The timer has been removed for a simpler experience. All correct answers receive 100 points.

### Adjust Scoring Formula
Currently set to 100 points for correct answers, 0 for incorrect. Modify in `main.py`:
```python
if is_correct:
    points = 100  # Change this value for different scoring
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
- [ ] Difficulty levels
- [ ] Achievement badges
- [ ] Sound effects
- [ ] Mobile app version

## License

MIT License - feel free to use and modify this project!

## Support

If you encounter any issues:
1. Make sure Python 3.7+ is installed
2. Ensure dependencies are installed: `pip install -r requirements.txt`
3. Check that the server is running on `http://localhost:5000`
4. Check browser console for any JavaScript errors (F12 → Console)

Enjoy the quiz! 🌍✨
