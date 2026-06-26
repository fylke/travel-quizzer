# ✈️ Travel Quiz Webapp

A fun interactive quiz game where you guess travel destinations based on hints and images. 

## Project Structure

```
travel-quizzer/
├── backend/
│   ├── __init__.py        # Flask app initialization
│   ├── __main__.py        # Entry point
│   └── models.py          # SQLAlchemy models
├── frontend/
│   ├── index.html         # Main HTML page
│   ├── style.css          # Styling
│   ├── app.js             # Core app logic (state, auth, quiz flow)
│   ├── admin.js           # Admin panel
│   ├── modal.js           # Modal dialogs and focus traps
│   └── markdown.js        # Markdown renderer
├── database/
│   └── .gitkeep           # Placeholder for the local SQLite database folder
├── test_backend/            # Backend unit tests
├── test_e2e/              # End-to-end Playwright tests
├── pyproject.toml         # Project configuration
├── Containerfile          # Container build configuration
├── podman-compose.yml     # Podman Compose orchestration
└── README.md              # This file
```

The `database/` directory is kept in the repo as a placeholder for local SQLite files, but the actual `quiz_data.db` file is generated locally and ignored by git.

## Setup Instructions

### Prerequisites
- Python 3.10 or higher
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Git

### Installation

1. **Clone and enter the project:**
   ```bash
   git clone <repo-url>
   cd travel-quizzer
   ```

2. **Install dependencies with uv:**
   ```bash
   uv sync
   ```

4. **(Optional) Auto-activate the venv with direnv:**

   If you'd like the virtual environment to activate automatically whenever you enter the project directory:

   ```bash
   # Install direnv (Ubuntu/Debian)
   sudo apt install direnv

   # Add the hook to your shell (bash)
   echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
   source ~/.bashrc

   # Allow the .envrc included in the repo
   direnv allow
   ```

   Now the venv activates/deactivates automatically as you enter/leave the directory.

## Running Unit Tests

```bash
uv run unit-test
```

## Running E2E Tests

```bash
uv sync --group test
uv run playwright install
uv run e2e-test
```

## Running the Application

### Podman

#### Prerequisites
- Podman installed ([Get Podman](https://podman.io/docs/installation))
- Podman Compose installed (`pip install podman-compose`)

#### Running with Podman Compose (Recommended)

1. **Build and start the container (-d for detached, to not block terminal):**
   ```bash
   podman-compose -f podman-compose.yml up --build -d
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:9696
   ```

3. **Stop the container:**
   ```bash
   podman-compose -f podman-compose.yml down
   ```

## Environment Variables

| Variable            | Description                                                                     | Example                           |
| ---------------------| ---------------------------------------------------------------------------------| -----------------------------------|
| `SECRET_KEY`        | Flask session signing key (required in production)                              | `change-me-in-production`         |
| `QUIZ_DATABASE_URL` | SQLAlchemy database URI                                                         | `sqlite:///database/quiz_data.db` |
| `SMTP_HOST`         | SMTP server hostname for sending password reset emails                          | `smtp.gmail.com`                  |
| `SMTP_PORT`         | SMTP server port (1–65535)                                                      | `587`                             |
| `SMTP_USERNAME`     | SMTP authentication username                                                    | `user@gmail.com`                  |
| `SMTP_PASSWORD`     | SMTP authentication password                                                    | `app-password`                    |
| `SMTP_FROM_ADDRESS` | Sender address for outgoing emails                                              | `noreply@travelquizzer.com`       |
| `SMTP_USE_TLS`      | Use TLS for SMTP connection (`"true"` enables, any other value uses plain SMTP) | `true`                            |

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

## License

MIT License - feel free to use and modify this project!

## Support

If you encounter any issues:
1. Make sure Python 3.10+ is installed
2. Make sure uv is installed: `uv --version`
3. Ensure dependencies are installed: `uv sync`
4. Check that the server is running on `http://localhost:5000`
5. Check browser console for any JavaScript errors (F12 → Console)

Enjoy the quiz! 🌍✨
