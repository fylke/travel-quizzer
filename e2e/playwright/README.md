Playwright Python E2E tests for travel-quizzer

Prerequisites:
- Python 3.8+
- The app running locally at http://localhost:5000 (start with `poetry run python -m src.main`)

Install and run:

```bash
cd e2e/playwright
python -m pip install -r requirements.txt
# Option A: let Playwright download browser binaries (may fail on some platforms)
python -m playwright install
python run.py

# Option B: use a system-installed Chrome/Chromium and skip Playwright browser download
# 1) Ensure Chrome or Chromium is installed and available on PATH.
# 2) Install Python requirements only and skip `playwright install`:
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 python -m pip install -r requirements.txt
BASE_URL=http://127.0.0.1:5000 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 python run.py
```

Override the target URL with `BASE_URL`:

```bash
BASE_URL=http://127.0.0.1:5000 python run.py
```

The repo also includes a `nox` session for Playwright:

```bash
nox -s playwright
```

If you want to use a system-installed browser instead of downloading Playwright browsers:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 nox -s playwright
```

I can also add a small `nox` session or GitHub Action to run these automatically; tell me if you want that.
