#!/bin/sh
# Seed the database if it's empty, then start the app
python -m scripts.seed_db
exec uv run --no-project python -m backend
