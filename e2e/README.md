Playwright E2E tests for travel-quizzer

Prerequisites:
- Python 3.8+
- The app running locally at http://localhost:5000 (start with `poetry run python -m src.main`)

Optional: create a local virtual environment
If you prefer a project-local virtual environment (recommended), create and activate `.venv` and install requirements:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
python -m pip install -r e2e/playwright/requirements.txt
python -m playwright install
```

Install and run the Playwright (Python) tests:

```bash
cd e2e/playwright
python -m pip install -r requirements.txt
python -m playwright install
python run.py
```

Override the target URL with `BASE_URL`, e.g.:

```bash
BASE_URL=http://127.0.0.1:5000 python run.py
```

The Node-based Puppeteer runner has been removed in favor of the Python Playwright tests.
