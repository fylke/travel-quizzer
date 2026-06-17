#!/bin/sh
# Seed the database if it's empty, then start the app
uv run --no-project python -m scripts.seed_db
exec uv run --no-project python -m backend
